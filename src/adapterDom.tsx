import React from 'react';
import ReactDOM from 'react-dom';
import { AxiosInstance, AxiosResponse } from 'axios';
import { AdapterData, InitOptions, Method, Settings } from './axiosAdapter';
import { Modal, Tabs } from 'antd';
import { SettingsPanel } from './views/settingsPanel';
import { GlobalOutlined } from '@ant-design/icons';
import { AdapterDataPanel } from './views/adapterDataPanel';
import { theme } from './theme';

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
  adapterData: AdapterData
}

export class AdapterDom extends React.PureComponent<Props, State> {
  el: HTMLDivElement;
  rootEl?: HTMLElement;
  dragging: boolean = false;
  isMove: boolean = false;

  constructor(props: Props) {
    super(props);
    const { service, options, settings, adapterData } = props;

    this.el = document.createElement('div');
    this.initPortal(options);

    this.useRequestAdapter(service);
    this.useResponseAdapter(service);

    this.state = {
      modalVisible: false,
      x: 50,
      y: 50,
      settings: JSON.parse(JSON.stringify(settings)),
      adapterData: JSON.parse(JSON.stringify(adapterData)),
    }
  }

  initPortal(options: InitOptions) {
    const targetNode = typeof options.mountNode === 'string' ? document.getElementById(options.mountNode) : options.mountNode;
    if (!targetNode) {
      throw new Error(`cannot find mountNode: [${String(options.mountNode)}], please check if the spcify node is exsits`);
    }
    this.rootEl = targetNode;
  }

  componentDidMount() {
    this.rootEl?.appendChild(this.el);
    document.addEventListener('mousemove', this.mousemoveEvent);

  }

  componentWillUnmount() {
    this.rootEl?.removeChild(this.el);
    document.removeEventListener('mousemove', this.mousemoveEvent);
  }

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

  extractAdapterData = (url: string = '', method: string = '', jsonData: string) => {
    const { adapterData } = this.state;

    const site = location.href;
    const namespace = adapterData[site];
    if (!namespace || !Array.isArray(namespace)) return null;

    const targetUrlScope = namespace.find(item => {
      return item.url === url && item.method === method
    });

    if (!targetUrlScope) return null;

    const targetParamsScope = targetUrlScope.params.find(item => {
      return item.data === jsonData;
    });

    if (targetParamsScope) return targetParamsScope.response;
    else return null;
  }

  useRequestAdapter<T>(service: AxiosInstance) {
    service.interceptors.request.use(cfg => {
      if (this.state.settings.switch) {
        const { bannedUrl, bannedSite } = this.state.settings;
        const site = location.href;
        const url = cfg.url;

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

  updateAdapterData = (url: string, method: Method, requestData: string, responseData: any, status: number) => {
    const { adapterData } = this.state;
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

    const paramsTargetIndex = namespace[targetUrlScopeIndex].params.findIndex(item => item.data === requestData)

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

  changeModalVisible = () => {
    this.setState({
      modalVisible: !this.state.modalVisible
    })
  }

  handleUpdateSettingsFields = (field: string, value: any) => {
    const { onUpdateSettings } = this.props;
    const { settings } = this.state;
    const newSettings = { ...settings };
    newSettings[field] = value;

    this.setState({
      settings: { ...newSettings }
    });

    onUpdateSettings(newSettings);
  }

  handleUpdateAdapterData = (value: AdapterData) => {
    const { onUpdateAdapterData } = this.props;
    const newVal = { ...value };

    this.setState({ adapterData: newVal });
    onUpdateAdapterData(newVal);
  }

  render() {
    const { modalVisible, x, y } = this.state;
    const { settings, adapterData } = this.state;

    return ReactDOM.createPortal(
      (
        <>
          <div
            style={{
              boxShadow: `0px 0px 3px 2px ${theme.color6}`,
              backgroundColor: theme.color6,
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
      ),
      this.el
    )
  }
}
