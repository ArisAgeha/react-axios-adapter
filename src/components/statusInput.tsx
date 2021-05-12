import React, { useState, useEffect, } from 'react';
import { Input } from 'antd';

interface Props {
  value: number;
  onChange(val: number): void;
}

export const StatusInput: React.FC<Props> = ({ value, onChange }) => {
  const [innerValue, setInnerValue] = useState<number>();

  useEffect(() => {
    initInnerValue();
  }, [value]);

  function initInnerValue() {
    try {
      setInnerValue(value);
    }
    catch (err) {
      console.error(err);
    }
  }

  function handleValueChange(value: number) {
    setInnerValue(value);
  }

  function updateValue(value: number) {
    const newVal = value;
    onChange(newVal);
  }

  return (
    <Input
      value={innerValue}
      onChange={(val) => { handleValueChange(Number(val.target.value)) }}
      onBlur={(val) => { updateValue(Number(val.target.value)) }}
    />
  )
}
