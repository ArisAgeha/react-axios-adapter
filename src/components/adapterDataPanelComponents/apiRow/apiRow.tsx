import React, { useState } from 'react';
import { CaretDownOutlined, CaretRightOutlined, DeleteOutlined } from '@ant-design/icons';
import { ApiData, Settings } from '../../../index';
import { ApiRowTable } from '../apiRowTable/apiRowTable';

interface Props {
  rowData: ApiData[];
  settings: Settings;
  filterUrl: string;
  filterStatus: string;
  onUpdateRowData(rowData: ApiData[]): void;
  onUpdateSettingsField(field: string, value: any): void;
  onDeleteRow(index: number): void;
}

export const ApiRow: React.FC<Props> = ({
  rowData,
  onUpdateRowData,
  settings,
  onUpdateSettingsField,
  filterUrl,
  filterStatus,
  onDeleteRow
}) => {
  const [expandedApiKey, setExpandedApiKey] = useState<string[]>([]);
  const { bannedUrl } = settings;

  function handleSwitchExpandedKey(val: string) {
    const newExpandedApiKey = [...expandedApiKey];

    const index = expandedApiKey.indexOf(val);
    if (index === -1) {
      newExpandedApiKey.push(val);
    }
    else {
      newExpandedApiKey.splice(index, 1);
    }

    setExpandedApiKey(newExpandedApiKey);
  }

  function handleTableDataUpdate(apiData: ApiData, index: number) {
    const newRowData = [...rowData];
    newRowData[index] = apiData;
    onUpdateRowData(newRowData);
  }

  function handleActiveUrl(url: string) {
    const newBannerUrl = { ...bannedUrl };
    newBannerUrl[url] = false;
    onUpdateSettingsField('bannedUrl', newBannerUrl);
  }

  function handleInactiveUrl(url: string) {
    const newBannerUrl = { ...bannedUrl };
    newBannerUrl[url] = true;
    onUpdateSettingsField('bannedUrl', newBannerUrl);
  }

  return (
    <div>
      <div style={{}}>
        {rowData.map((apiData, index) => {
          const isExpanded = expandedApiKey.includes(apiData.url);
          const isBanned = bannedUrl && bannedUrl[apiData.url] && bannedUrl[apiData.url];
          const isMatchUrl = !filterUrl || apiData.url.includes(filterUrl);
          const hasChild = !filterStatus || apiData.params.some(item => String(item.status).includes(filterStatus));

          return (
            <div key={apiData.url} style={{ marginLeft: '32px', display: isMatchUrl && hasChild ? 'block' : 'none' }}>
              <div
                onClick={() => { handleSwitchExpandedKey(apiData.url) }}
                key={apiData.url}
                style={{
                  fontSize: '700',
                  marginBottom: '6px',
                  borderRadius: '6px',
                  padding: '0 6px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  textOverflow: 'ellipsis',
                  width: '95%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden'
                }}>
                  <span>{isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}</span>

                  {
                    isBanned
                      ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActiveUrl(apiData.url)
                          }}
                          style={{ color: 'red', paddingLeft: '4px' }}>
                          已暂停
                        </span>
                      )
                      : (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInactiveUrl(apiData.url)
                          }}
                          style={{ color: 'green', paddingLeft: '4px' }}>
                          启用中
                        </span>
                      )
                  }

                  <span style={{ marginLeft: '8px', color: 'red' }} onClick={() => { onDeleteRow(index) }}>
                    <DeleteOutlined />
                  </span>

                  <div style={{ marginLeft: '4px', display: 'inline-block' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '0px 4px',
                      // backgroundColor: theme.color6,
                      // color: theme.color1,
                      borderRadius: '4px',
                      marginRight: '8px',
                      fontWeight: 700
                    }}>
                      {apiData.method?.toUpperCase()}
                    </span>

                    <span style={{ display: 'inline-block' }}>
                      {apiData.url}
                    </span>

                  </div>
                </div>
              </div>
              {isExpanded &&
                <div style={{ marginBottom: '16px' }}>
                  <ApiRowTable
                    tableData={apiData}
                    onUpdateTableData={(newApiData) => { handleTableDataUpdate(newApiData, index); }}
                    settings={settings}
                    onUpdateSettingsField={onUpdateSettingsField}
                    filterStatus={filterStatus}
                  />
                </div>
              }
            </div>
          )
        })}
      </div>
    </div>
  );
}
