import React, { useState, useEffect, } from 'react';
import { Input, message } from 'antd';

interface Props {
  value: Object;
  onChange(val: Object): void;
}

export const JSONInput: React.FC<Props> = ({ value, onChange }) => {
  const [innerValue, setInnerValue] = useState<string>('');

  useEffect(() => {
    initInnerValue();
  }, [value]);

  function initInnerValue() {
    try {
      const newVal = JSON.parse(JSON.stringify(value));
      setInnerValue(newVal);
    }
    catch (err) {
      console.error(err);
    }
  }

  function handleValueChange(value: string) {
    setInnerValue(value);
  }

  function updateValue(value: string) {
    try {
      const newVal = JSON.parse(value);
      onChange(newVal);
    }
    catch (err) {
      console.error(err);
      message.error('请输入正确的JSON');
      initInnerValue();
    }
  }

  return (
    <Input.TextArea value={innerValue}
      onChange={(val) => { handleValueChange(val.target.value) }}
      onBlur={(val) => { updateValue(val.target.value) }}
    />
  )
}
