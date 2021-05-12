
import React, { useState, useMemo } from 'react';
import { Input } from 'antd';
import { AdapterData, ApiData, Settings } from '../index';
import { theme } from '../theme';
import { CaretDownOutlined, CaretRightOutlined, DeleteOutlined } from '@ant-design/icons';
import { ApiRow } from '../components/adapterDataPanelComponents/apiRow/apiRow';
import { FocusInput } from '../components/focusInput';
import 'antd/dist/antd.css';

interface Props {
  adapterData: AdapterData;
  onUpdateAdapterData(value: AdapterData): void;
  settings: Settings;
  onUpdateSettingsField(field: string, value: any): void;
}

export const AdapterDataPanel: React.FC<Props> = ({ adapterData, onUpdateAdapterData, settings, onUpdateSettingsField }) => {

  const [expandedKey, setExpandedKey] = useState<string[]>([]);
  const { bannedSite } = settings;
  const [filterSite, setFilterSite] = useState<string>('');
  const [filterUrl, setFilterUrl] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const adapterDataArray = useMemo(() => {
    const array = [];
    for (let site in adapterData) {
      array.push({ site, apiData: adapterData[site] });
    }
    return array;
  }, [adapterData]);

  function handleSwitchExpandedKey(site: string) {
    if (expandedKey.includes(site)) {
      const newExpandedKey = expandedKey.filter(item => item !== site);
      setExpandedKey(newExpandedKey);
    }
    else {
      setExpandedKey([...expandedKey, site]);
    }
  }

  function handleUpdateRowData(site: string, rowData: ApiData[]) {
    const newAdapterData = { ...adapterData };
    newAdapterData[site] = rowData;
    onUpdateAdapterData(newAdapterData);
  }

  function handleDeleteRow(site: string, index: number) {
    const newAdapterData = { ...adapterData };
    newAdapterData[site].splice(index, 1);
    onUpdateAdapterData(newAdapterData);
  }


  function handleDeleteSite(site: string) {
    const newAdapterData = { ...adapterData };
    delete newAdapterData[site];
    onUpdateAdapterData(newAdapterData);
  }

  function handleActiveSite(site: string) {
    const newBannerSite = { ...bannedSite };
    newBannerSite[site] = false;
    onUpdateSettingsField('bannedSite', newBannerSite);
  }

  function handleInactiveSite(site: string) {
    const newBannerSite = { ...bannedSite };
    newBannerSite[site] = true;
    onUpdateSettingsField('bannedSite', newBannerSite);
  }

  function updateFields(field: string, value: any) {
    onUpdateSettingsField(field, value);
  }


  return (
    <div style={{ height: '600px', overflowY: 'auto' }}>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
        <Input
          style={{ width: '240px', marginRight: '16px' }}
          value={filterSite}
          onChange={(ev) => { setFilterSite(ev.target.value) }}
          size="small"
          placeholder={'过滤域名...'}
        />
        <Input
          style={{ width: '240px', marginRight: '16px' }}
          value={filterUrl}
          onChange={(ev) => { setFilterUrl(ev.target.value) }}
          size="small"
          placeholder={'过滤url...'}
        />
        <Input
          style={{ width: '120px', marginRight: '16px' }}
          value={filterStatus}
          onChange={(ev) => { setFilterStatus(ev.target.value) }}
          size="small"
          placeholder={'过滤状态码...'}
        />
        <FocusInput
          value={settings.fieldFocus}
          onChange={(value) => { updateFields('fieldFocus', value); }}
        />
      </div>

      {
        adapterDataArray.map(item => {
          const isBanned = bannedSite && bannedSite[item.site];
          const canShow = !filterUrl || item.apiData.some(item => item.url.includes(filterUrl));
          const hasChild = !filterSite || item.site.includes(filterSite);

          return item.apiData?.length > 0 && (
            <div key={item.site} style={{ display: canShow && hasChild ? 'block' : 'none' }}>
              <div
                onClick={() => { handleSwitchExpandedKey(item.site); }}
                style={{
                  backgroundColor: theme.color6,
                  color: theme.color1,
                  fontSize: '700',
                  marginBottom: '6px',
                  borderRadius: '6px',
                  padding: '0 6px',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  textOverflow: 'ellipsis',
                  width: '95%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}>
                  {expandedKey.includes(item.site) ? <CaretDownOutlined /> : <CaretRightOutlined />}

                  {
                    isBanned
                      ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActiveSite(item.site)
                          }}
                          style={{ color: 'red', paddingLeft: '4px' }}>
                          已暂停
                        </span>
                      )
                      : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInactiveSite(item.site)
                          }}
                          style={{ color: '#61ff61', paddingLeft: '4px' }}>
                          启用中
                        </span>
                      )
                  }

                  <span style={{ marginLeft: '4px', color: 'rgb(255 0 160)' }} onClick={() => { handleDeleteSite(item.site) }}>
                    <DeleteOutlined />
                  </span>

                  <span style={{ marginLeft: '4px' }}>调用归属域名：{item.site}</span>
                </div>
              </div>

              { expandedKey.includes(item.site) && (
                <ApiRow
                  rowData={item.apiData}
                  settings={settings}
                  filterUrl={filterUrl}
                  filterStatus={filterStatus}
                  onUpdateRowData={(rowData) => { handleUpdateRowData(item.site, rowData) }}
                  onUpdateSettingsField={onUpdateSettingsField}
                  onDeleteRow={(index) => { handleDeleteRow(item.site, index) }}
                />
              )}
            </div>
          )
        })
      }
    </div>
  );
}
