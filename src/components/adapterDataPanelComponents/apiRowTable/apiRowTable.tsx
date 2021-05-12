import React from 'react';
import { Table } from 'antd';
import { ApiData, Params, Settings } from '../../../index';
import { ColumnType } from 'antd/lib/table';
import { JSONInput } from '../../jsonInput';
import { StatusInput } from '../../statusInput';
import { isObject } from '../../../utils';

interface Props {
  tableData: ApiData;
  onUpdateTableData(newVal: ApiData): void;
  settings: Settings;
  onUpdateSettingsField(field: string, value: any): void;
  filterStatus: string;
}

export const ApiRowTable: React.FC<Props> = ({ tableData, onUpdateTableData, settings, onUpdateSettingsField, filterStatus }) => {

  const { fieldFocus } = settings;

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
        const initValue = value;

        if (fieldFocus) {
          const path = fieldFocus.slice(1).split('.');
          if (!isObject(value)) value = {};

          for (let index = 0; index < path.length; index++) {
            const p = path[index];
            if (!isObject(value[p]) && (index !== path.length - 1)) value[p] = {};
            value = value[p];
          }

          if (typeof value === 'undefined') value = '';
        }
        let stringifyValue = '';
        try {
          stringifyValue = JSON.stringify(value);
        }
        catch (err) {
          console.error(err);
        }
        return <JSONInput value={stringifyValue} onChange={(newVal) => { handleUpdateResponse(newVal, index, initValue); }} />
      }
    },
  ];

  const computedDataSource = filterStatus ? tableData.params.filter(item => String(item.status).includes(filterStatus)) : tableData.params;

  function handleCompleteValue(completeValue: Object, insertValue: Object) {
    if (!completeValue) completeValue = {};
    const path = fieldFocus.slice(1).split('.');

    let curPath = completeValue;
    path.forEach((p, index) => {
      if (!isObject(curPath[p])) curPath[p] = {};
      if (index === path.length - 1) curPath[p] = insertValue;
      else curPath = curPath[p];
    });

    return completeValue;
  }

  function handleUpdateResponse(val: Object, index: number, completeValue: Object) {
    let updateData = val;
    if (fieldFocus) {
      updateData = handleCompleteValue(completeValue, val);
    }

    const newTableData: ApiData = JSON.parse(JSON.stringify(tableData));
    newTableData.params[index].response = updateData;
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
