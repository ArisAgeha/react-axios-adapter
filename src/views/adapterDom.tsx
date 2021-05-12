import React from 'react';
import { AxiosInstance, AxiosResponse } from 'axios';
import { AdapterData, InitOptions, Method, Params, Settings } from '../index';
import { Modal, Tabs, message } from 'antd';
import { SettingsPanel } from './settingsPanel';
import { GlobalOutlined } from '@ant-design/icons';
import { AdapterDataPanel } from './adapterDataPanel';
import { theme } from '../theme';

interface Props {
  service: AxiosInstance;
  adapterData: AdapterData;
  settings: Settings;
  options: InitOptions;
  onUpdateAdapterData(newAdapterData: AdapterData): void;
  onUpdateSettings(newSettings: Settings): void;
}

interface State {
  modalVisible: boolean;
  x: number;
  y: number;
  settings: Settings,
  adapterData: AdapterData;
  settingsHasChanged: boolean;
}

type PruneData = {
  lastCallTime: number;
  siteUrl: string;
  api: string;
}

export class AdapterDom extends React.PureComponent<Props, State> {
  readonly ignoreParamsSymbol = '__ignoreParamsSymbol__';

  dragging: boolean = false;
  isMove: boolean = false;
  interval: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    const { service, settings, adapterData } = props;

    this.useRequestAdapter(service);
    this.useResponseAdapter(service);

    this.state = {
      modalVisible: false,
      x: 50,
      y: 50,
      settings: JSON.parse(JSON.stringify(settings)),
      adapterData: JSON.parse(JSON.stringify(adapterData)),
      settingsHasChanged: false,
    }
  }

  componentDidMount() {
    const { options } = this.props;
    document.addEventListener('mousemove', this.mousemoveEvent);

    if (options.intervalTime) this.interval = setInterval(this.saveToSource, options.intervalTime);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.mousemoveEvent);

    if (this.interval) clearInterval(this.interval);
  }

  /** mouse event handler */
  mousemoveEvent = (e: MouseEvent) => {
    e.stopPropagation();
    if (!this.dragging) return;
    const { x, y } = this.state;
    const cmpX = x - e.movementX;
    const cmpY = y - e.movementY;
    this.isMove = true;

    this.setState({
      x: cmpX,
      y: cmpY
    })
  }

  handleMousedown = () => {
    this.dragging = true;
    this.isMove = false;
  }

  handleMouseUp = () => {
    this.dragging = false;
    if (!this.isMove) this.changeModalVisible();
  }

  /** request adapter main methods */

  useRequestAdapter<T>(service: AxiosInstance) {
    service.interceptors.request.use(cfg => {
      if (this.state.settings.switch) {
        const { bannedUrl, bannedSite } = this.state.settings;
        const site = location.href;
        const url = this.isAbsoluteURL(cfg.url) ? cfg.url : this.combineURLs(cfg.baseURL || '', cfg.url);

        if (!url) return { ...cfg };
        if (!this.isUrlMatchRegExp(url) || !this.isSiteMatchRegExp(site)) return { ...cfg };
        if (bannedUrl && bannedUrl[url]) return { ...cfg };
        if (bannedSite && bannedSite[site]) return { ...cfg };

        const method = cfg.method;
        const data = cfg.data;
        const jsonData = JSON.stringify(data);
        const targetMock = this.extractAdapterData(url, method, jsonData);
        if (!targetMock) return { ...cfg };

        return {
          ...cfg,
          adapter: function (config: any) {
            return new Promise((resolve, reject) => {
              resolve(targetMock);
            });
          }
        }
      }
      return { ...cfg };
    })
  }

  isAbsoluteURL(url: string) {
    return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
  };

  combineURLs(baseURL: string, relativeURL: string) {
    return relativeURL
      ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
      : baseURL;
  };

  extractAdapterData = (url: string = '', method: string = '', jsonData: string) => {
    const { adapterData, settings } = this.state;

    const site = location.href;
    const namespace = adapterData[site];
    if (!namespace || !Array.isArray(namespace)) return null;

    const targetUrlScope = namespace.find(item => {
      return item.url === url && item.method === method
    });

    if (!targetUrlScope) return null;

    let targetParamsScope: Params | undefined;

    if (settings.ignoreParams && targetUrlScope?.params?.length > 0) targetParamsScope = targetUrlScope.params[0];
    else targetParamsScope = targetUrlScope.params.find(item => item.data === jsonData);

    if (targetParamsScope) return targetParamsScope.response;
    else return null;
  }

  /** response adapter main methods */
  useResponseAdapter(service: AxiosInstance) {
    service.interceptors.response.use(response => {
      this.responseHandler(response);
      return { ...response }
    }, err => {
      const response = err.response;
      this.responseHandler(response);
      return Promise.reject(err);
    });
  }

  responseHandler = (response: AxiosResponse) => {
    if (!response) return;

    if (this.state.settings.switch || this.state.settings.saveSwitch) {
      const { bannedUrl, bannedSite } = this.state.settings;
      const site = location.href;
      const url = response.config.url;
      const urlIsBanned = bannedUrl && bannedUrl[url as string];
      const siteIsBanned = bannedSite && bannedSite[site as string];

      if (!urlIsBanned && !siteIsBanned && this.isUrlMatchRegExp(url as string) && this.isSiteMatchRegExp(site)) {
        const method = response.config.method;
        const jsonData = response.config.data;
        const status = response.status;
        this.updateAdapterData(url as string, method as Method, jsonData, response, status);
      }
    }
  }

  updateAdapterData = (url: string, method: Method, requestData: string, responseData: any, status: number) => {
    const { adapterData, settings } = this.state;
    const { onUpdateAdapterData } = this.props;
    const site = location.href;
    let namespace = adapterData[site];
    if (!namespace || !Array.isArray(namespace)) namespace = [];

    let targetUrlScopeIndex = namespace.findIndex(item => {
      return item.url === url && item.method === method
    });

    if (targetUrlScopeIndex === -1) {
      namespace.push({ method, url, params: [], header: '', lastCallTime: Number(new Date()) })
      targetUrlScopeIndex = namespace.length - 1;
    }
    else if (!namespace[targetUrlScopeIndex].params) {
      namespace[targetUrlScopeIndex].params = [];
    }

    namespace[targetUrlScopeIndex].lastCallTime = Number(new Date());

    const searchParams = settings.ignoreParams ? this.ignoreParamsSymbol : requestData;

    const paramsTargetIndex = namespace[targetUrlScopeIndex].params.findIndex(item => item.data === searchParams)

    if (paramsTargetIndex === -1) {
      namespace[targetUrlScopeIndex].params.push({
        data: requestData,
        response: responseData,
        status,
        key: String(Number(new Date()))
      });
    }
    else {
      namespace[targetUrlScopeIndex].params[paramsTargetIndex] = {
        data: requestData,
        response: responseData,
        status,
        key: String(Number(new Date()))
      }
    }

    adapterData[site] = [...namespace];

    this.setState({ adapterData: JSON.parse(JSON.stringify({ ...adapterData })) });
    onUpdateAdapterData(adapterData);
  }

  /** request/response adapter utils */
  isSiteMatchRegExp(siteUrl: string) {
    const { settings } = this.state;
    const { includeSiteRegexp, excludeSiteRegexp } = settings;
    if (excludeSiteRegexp) {
      const regExp = new RegExp(excludeSiteRegexp);
      if (regExp.test(siteUrl)) return false;
    }
    if (includeSiteRegexp) {
      const regExp = new RegExp(includeSiteRegexp);
      return regExp.test(siteUrl);
    }

    return true;
  }

  isUrlMatchRegExp(url: string) {
    const { settings } = this.state;
    const { includeRegexp, excludeRegexp } = settings;
    if (excludeRegexp) {
      const regExp = new RegExp(excludeRegexp);
      if (regExp.test(url)) return false;
    }
    if (includeRegexp) {
      const regExp = new RegExp(includeRegexp);
      return regExp.test(url);
    }

    return true;
  }

  /**  adapterData or settings update handler */
  handleUpdateSettingsFields = (field: string, value: any, shouldSave?: boolean) => {
    const { onUpdateSettings } = this.props;
    const { settings } = this.state;
    const newSettings = { ...settings };
    newSettings[field] = value;

    this.setState({
      settings: { ...newSettings },
      settingsHasChanged: true
    });

    if (shouldSave) this.saveToSource();
    onUpdateSettings(newSettings);
  }

  handleUpdateAdapterData = (value: AdapterData) => {
    const { onUpdateAdapterData } = this.props;
    const newVal = { ...value };

    this.setState({ adapterData: newVal });
    onUpdateAdapterData(newVal);
  }

  /** save to source: localstorage or remote */
  saveToSource = () => {
    const options = this.props.options;
    if (options.dataSource && options.remoteApi) {
      // TODO: to implement
    }
    else {
      const json = JSON.stringify({ settings: this.state.settings, adapterData: this.state.adapterData });
      const bufferLength = Buffer.byteLength(json, 'utf8');
      if (bufferLength > 3500000) {
        this.pruneData();
        message.warn('LocalStorage使用量已接近4MB，已自动清理最近未使用的缓存');
        const json = JSON.stringify({ settings: this.state.settings, adapterData: this.state.adapterData });
        localStorage.setItem(options.localStorageKey, json);
        return;
      }
      localStorage.setItem(options.localStorageKey, json);
    }

    this.setState({
      settingsHasChanged: false
    });
  }

  pruneData = () => {
    let pruneMap: PruneData[] = [];
    const adapterData = this.state.adapterData;
    for (let siteUrl in adapterData) {
      adapterData[siteUrl].forEach(item => pruneMap.push({ api: item.url, siteUrl, lastCallTime: item.lastCallTime }));
    }

    pruneMap = pruneMap.sort((a, b) => {
      return a.lastCallTime - b.lastCallTime;
    });

    for (let item of pruneMap) {
      adapterData[item.siteUrl] = adapterData[item.siteUrl].filter(urlItem => urlItem.url !== item.api);
      const targetIndex = adapterData[item.siteUrl].findIndex(urlItem => urlItem.url === item.api)
      if (targetIndex !== -1) adapterData[item.siteUrl].splice(targetIndex, 1);
      const json = JSON.stringify(adapterData);
      if (Buffer.byteLength(json, 'utf8') < 3000000) break;
    }

    this.setState({ adapterData: { ...adapterData } });
  }

  /** configuration modal visible */
  changeModalVisible = () => {
    this.setState({
      modalVisible: !this.state.modalVisible
    })
  }

  render() {
    const { modalVisible, x, y } = this.state;
    const { settings, adapterData, settingsHasChanged } = this.state;

    if (settings.forceHideEntry) return <div></div>;

    const iconColor = settings.switch
      ? theme.color6
      : (settings.saveSwitch ? theme.special : theme.disabled);

    return (
      <>
        <div
          style={{
            boxShadow: `0px 0px 3px 2px ${iconColor}`,
            backgroundColor: iconColor,
            color: theme.color1,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'fixed',
            right: `${x}px`,
            bottom: `${y}px`,
            height: '50px',
            width: '50px',
            borderRadius: '50%',
            fontSize: '28px',
            zIndex: 99999,
          }}
          onMouseDown={(e) => { e.stopPropagation(); this.handleMousedown(); }}
          onMouseUp={(e) => { e.stopPropagation(); this.handleMouseUp(); }}
        >
          <GlobalOutlined />
        </div>

        <Modal
          visible={modalVisible}
          onCancel={this.changeModalVisible}
          footer={null}
          width={1200}
        >
          <div style={{
            margin: '16px',
            color: '#fff',
          }}>
            <div
              style={{
                cursor: 'pointer',
                padding: '0 16px',
                borderRadius: '16px',
                background: settingsHasChanged ? theme.special : theme.color6,
                display: 'inline-block',
                transition: '0.2s ease-in-out'
              }}
              onClick={() => { this.saveToSource(); message.success('同步完成'); }}>
              立即保存配置
              </div>
          </div>
          <Tabs defaultActiveKey="settings" tabPosition={'left'} style={{ paddingRight: '32px' }}>
            <Tabs.TabPane tab={`Settings`} key={'settings'}>
              <SettingsPanel settings={settings} onUpdateSettingsField={this.handleUpdateSettingsFields} />
            </Tabs.TabPane>
            <Tabs.TabPane tab={`Adapter Data`} key={'adapterData'}>
              <AdapterDataPanel
                adapterData={adapterData}
                onUpdateAdapterData={(value) => { this.handleUpdateAdapterData(value) }}
                settings={settings}
                onUpdateSettingsField={this.handleUpdateSettingsFields}
              />
            </Tabs.TabPane>
          </Tabs>
        </Modal>
      </>
    )
  }
}
