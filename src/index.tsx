import React, { PureComponent } from 'react';
import { AxiosInstance } from "axios";
import { AdapterDom } from './adapterDom';
import { isIp, isObject } from './utils';
import { message } from '_antd@4.3.5@antd';

export type Method = 'post' | 'get' | 'put' | 'delete' | 'options';

export type Params = {
  data: string;
  response: any;
  status: number;
  key: string;
};

export type ApiData = {
  method: Method;
  params: Params[];
  url: string;
  header: string;
  lastCallTime: number;
}

export interface AdapterData {
  [key: string]: ApiData[];
}

type PruneData = {
  lastCallTime: number;
  siteUrl: string;
  api: string;
}

export interface InitOptions {
  dataSource: 'localstorage' | 'remote';
  remoteApi: string | undefined;
  saveApi: string | undefined;
  localStorageKey: string;
  intervalTime: number | false;
  mountNode: string | HTMLElement;
}

export interface Settings {
  switch: boolean;
  saveSwitch: boolean;
  includeRegexp: string;
  excludeRegexp: string;
  includeSiteRegexp: string;
  excludeSiteRegexp: string;
  bannedUrl: { [key: string]: boolean };
  bannedSite: { [key: string]: boolean };
}

const defaultOptions: InitOptions = {
  dataSource: 'localstorage',
  remoteApi: undefined,
  saveApi: undefined,
  localStorageKey: '_axiosAdapter',
  intervalTime: 3000,
  mountNode: document.body
}

const defaultSettings: Settings = {
  switch: false,
  saveSwitch: false,
  includeRegexp: '',
  excludeRegexp: '',
  includeSiteRegexp: '',
  excludeSiteRegexp: '',
  bannedUrl: {},
  bannedSite: {}
}

export class AxiosAdapter {
  private static _instance: AxiosAdapter | null = null;
  private static _symbol = Symbol('instance');
  private adapterData: AdapterData = {};
  private settings: Settings = JSON.parse(JSON.stringify(defaultSettings)); // TODO: fix type
  private options: InitOptions = {} as InitOptions;
  private service: AxiosInstance | undefined;
  private dom: JSX.Element | null = null;

  constructor(service: AxiosInstance, options: Partial<InitOptions> = {}, symbol: symbol) {
    if (symbol !== AxiosAdapter._symbol) throw new Error('please init instance by [getInstance] method');
    if (!isIp) return;

    this.initOptions(options);
    this.options = options as InitOptions;
    this.service = service;
    this.initAdapterData(options as InitOptions);
    this.setInterval(options as InitOptions);
  }

  public static getInstance(service: AxiosInstance, options?: Partial<InitOptions>) {
    if (AxiosAdapter._instance) {
      return AxiosAdapter._instance;
    } else {
      const instance = new AxiosAdapter(service, options, this._symbol);
      AxiosAdapter._instance = instance;
      return instance;
    }
  }

  private setInterval(options: InitOptions) {
    if (options.intervalTime) setInterval(this.saveToSource, options.intervalTime);
  }

  private saveToSource = () => {
    const options = this.options;
    if (options.dataSource && options.remoteApi) {
      // TODO: to implement
    }
    else {
      const json = JSON.stringify({ settings: this.settings, adapterData: this.adapterData });
      const bufferLength = Buffer.byteLength(json, 'utf8');
      if (bufferLength > 3500000) {
        this.pruneData();
        message.warn('LocalStorage使用量已接近4MB，已自动清理最近未使用的缓存');
        const json = JSON.stringify({ settings: this.settings, adapterData: this.adapterData });
        localStorage.setItem(options.localStorageKey, json);
        return;
      }
      localStorage.setItem(options.localStorageKey, json);
    }
  }

  private pruneData = () => {
    let pruneMap: PruneData[] = [];
    const adapterData = this.adapterData;
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

    this.adapterData = { ...adapterData };
  }

  private initOptions(options: Partial<InitOptions>) {
    for (let opt in defaultOptions) {
      if (!options[opt]) options[opt] = defaultOptions[opt];
    }
  }

  private initAdapterData(options: InitOptions) {
    if (options.dataSource && options.remoteApi) {
      // TODO: to implement
    }
    else {
      const json = localStorage.getItem(options.localStorageKey as string)
      const formatError = `data from localStorage['${options.localStorageKey}'] is not a valid adapter data object!`;

      if (!json) return;

      try {
        const adapterData = JSON.parse(json);
        if (
          !isObject(adapterData)
          || !isObject(adapterData.settings)
          || !isObject(adapterData.adapterData)
        ) {
          console.error(formatError);
          return;
        }
        this.adapterData = adapterData.adapterData;
        this.settings = { ...(JSON.parse(JSON.stringify(defaultSettings))), ...adapterData.settings };
      }
      catch (err) {
        console.error(formatError);
      }
    }
  }

  renderDom() {
    if (!isIp) {
      console.error('you can only use adapter in dev');
      return <div></div>;
    }
    if (!AxiosAdapter._instance) {
      throw new Error('you should call [AxiosAdapter.getInstance] method before call [renderDom]');
    }
    if (this.dom) {
      return this.dom;
    } else {
      const dom = (<AdapterDom
        adapterData={this.adapterData}
        settings={this.settings}
        service={this.service as AxiosInstance}
        options={this.options}
        onUpdateAdapterData={(val: AdapterData) => { this.adapterData = val }}
        onUpdateSettings={(val: any) => {
          this.settings = val
        }}
      />);
      this.dom = dom;
      return dom;
    }
  }
}
