import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Switch, Table, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { ApiData, Params, Settings } from '../../../axiosAdapter';
import { ColumnType } from 'antd/lib/table';
import { JSONInput } from './components/jsonInput';
import { StatusInput } from './components/statusInput';

interface Props {
  tableData: ApiData;
  onUpdateTableData(newVal: ApiData): void;
  settings: Settings;
  onUpdateSettingsField(field: string, value: any): void;
  filterStatus: string;
}

export const ApiRowTable: React.FC<Props> = ({ tableData, onUpdateTableData, settings, onUpdateSettingsField, filterStatus }) => {

  const columns: ColumnType<Params>[] = [
    {
      title: '参数',
      dataIndex: 'data',
      key: 'data',
      width: 100,
    },
    {

      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render(value, row, index) {
        return <StatusInput value={value} onChange={(newVal) => { handleUpdateStatus(newVal, index) }} />
      }
    },
    {
      title: '响应结果',
      dataIndex: 'response',
      key: 'response',
      render(value, record, index) {
        let stringifyValue = '';
        try {
          stringifyValue = JSON.stringify(value);
        }
        catch (err) {
          console.error(err);
        }
        return <JSONInput value={stringifyValue} onChange={(newVal) => { handleUpdateResponse(newVal, index); }} />
      }
    },
  ];

  const computedDataSource = filterStatus ? tableData.params.filter(item => String(item.status).includes(filterStatus)) : tableData.params;

  function handleUpdateResponse(val: Object, index: number) {
    const newTableData: ApiData = JSON.parse(JSON.stringify(tableData));
    newTableData.params[index].response = val;
    onUpdateTableData(newTableData);
  }

  function handleUpdateStatus(val: number, index: number) {
    const newTableData: ApiData = JSON.parse(JSON.stringify(tableData));
    newTableData.params[index].status = val;
    newTableData.params[index].response.status = val;
    onUpdateTableData(newTableData);
  }

  return (
    <Table columns={columns} dataSource={computedDataSource} size={'small'} pagination={false} />
  )
}
