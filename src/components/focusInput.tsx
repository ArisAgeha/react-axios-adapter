import React, { useState, useEffect, } from 'react';
import { Input, message, Tooltip } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import { theme } from '../theme';

interface Props {
  value: string;
  onChange(val: string): void;
  style?: React.CSSProperties;
}

export const FocusInput: React.FC<Props> = ({ value, onChange, style = {} }) => {
  const [innerValue, setInnerValue] = useState<string>('');

  useEffect(() => {
    setInnerValue(value as string);
  }, [value]);

  function handleValueChange(value: string) {
    setInnerValue(value);
  }

  function updateValue(newValue: string) {
    if (!newValue) {
      onChange(newValue);
      return;
    }

    const isLegalValue = /^(\.[a-zA-Z0-9_]+)+$/.test(newValue);
    if (isLegalValue) {
      onChange(newValue);
    }
    else {
      message.error('输入格式必须形如 .xxx.yyy.zzz')
      setInnerValue(value as string);
    }
  }

  return (
    <>
      <Input
        value={innerValue}
        placeholder={'响应提取器，格式形如 .data.field'}
        onChange={(val) => { handleValueChange(val.target.value) }}
        onBlur={(val) => { updateValue(val.target.value) }}
        size="small"
        style={{
          width: '240px'
        }}
      />

      <Tooltip
        color={'blue'}
        title={<div>
          <div style={{ marginBottom: '12px' }}>在AdapterPanel中，api响应的response将会根据此项过滤字段。</div>
          <div style={{ marginBottom: '12px' }}>如填写了'.data.field'，则response输入框的内容正文为response.data.field的内容，修改时也仅修改此字段内的内容。</div>
          <div>注意：如果响应结果中缺少对应字段，在修改时会自动写入</div>
        </div>}>
        <QuestionCircleOutlined style={{ color: theme.color6, marginLeft: '4px' }} />
      </Tooltip>
    </>
  )
}
