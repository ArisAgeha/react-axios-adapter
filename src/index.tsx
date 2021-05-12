import React from 'react';
import ReactDOM, { render } from 'react-dom';
import { AxiosInstance } from "axios";
import { AdapterDom } from './views/adapterDom';
import { isObject } from './utils';

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
  ignoreParams: boolean;
  includeRegexp: string;
  excludeRegexp: string;
  includeSiteRegexp: string;
  excludeSiteRegexp: string;
  bannedUrl: { [key: string]: boolean };
  bannedSite: { [key: string]: boolean };
  fieldFocus: string;
  forceHideEntry: boolean;
}

const defaultOptions: InitOptions = {
  dataSource: 'localstorage',
  remoteApi: undefined,
  saveApi: undefined,
  localStorageKey: '_axiosAdapter',
  intervalTime: 30000,
  mountNode: document.body
}

const defaultSettings: Settings = {
  switch: false,
  saveSwitch: false,
  ignoreParams: false,
  includeRegexp: '',
  excludeRegexp: '',
  includeSiteRegexp: '',
  excludeSiteRegexp: '',
  bannedUrl: {},
  bannedSite: {},
  fieldFocus: '',
  forceHideEntry: false
}

export class AxiosAdapter {
  private static _instance: AxiosAdapter | null = null;
  private static _symbol = Symbol('instance');

  private adapterData: AdapterData = {};
  private settings: Settings = JSON.parse(JSON.stringify(defaultSettings));
  private options: InitOptions = {} as InitOptions;
  private service: AxiosInstance | undefined;
  private dom: JSX.Element | null = null;

  el: HTMLDivElement;
  rootEl?: HTMLElement;

  constructor(service: AxiosInstance, options: Partial<InitOptions> = {}, symbol: symbol) {
    if (symbol !== AxiosAdapter._symbol) throw new Error('please init instance by [getInstance] method');

    this.initOptions(options);
    this.options = options as InitOptions;
    this.service = service;
    this.initAdapterData(options as InitOptions);

    this.el = document.createElement('div');
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

  useDom() {
    if (!AxiosAdapter._instance) {
      throw new Error('you should call [AxiosAdapter.getInstance] method before call [renderDom]');
    }
    if (this.dom) {
      return this.dom;
    } else {
      this.el = document.createElement('div');
      this.initPortal(this.options);

      const dom = ReactDOM.createPortal(
        <AdapterDom
          adapterData={this.adapterData}
          settings={this.settings}
          service={this.service as AxiosInstance}
          options={this.options}
          onUpdateAdapterData={(val: AdapterData) => { this.adapterData = val; }}
          onUpdateSettings={(val: Settings) => { this.settings = val; }}
        />,
        this.el
      )

      render(dom, this.el);

      this.dom = dom;
      return dom;
    }
  }

  initPortal(options: InitOptions) {
    const targetNode = typeof options.mountNode === 'string' ? document.getElementById(options.mountNode) : options.mountNode;
    if (!targetNode) {
      throw new Error(`cannot find mountNode: [${String(options.mountNode)}], please check if the spcify node is exsits`);
    }
    this.rootEl = targetNode;
    this.rootEl?.appendChild(this.el);
  }
}
