
import React from 'react';
import { Form, Switch, Input, Button, Popconfirm } from 'antd';
import { Settings } from '../index';

interface Props {
  settings: Settings;
  onUpdateSettingsField(field: string, value: any, shouldSave?: boolean): void;
}

export const SettingsPanel: React.FC<Props> = ({ settings, onUpdateSettingsField }) => {
  const [formRef] = Form.useForm();

  function updateFields(field: string, value: any) {
    onUpdateSettingsField(field, value);
  }

  function handleHideEntry() {
    onUpdateSettingsField('forceHideEntry', true, true);
  }

  return (
    <div style={{ height: '600px', overflowY: 'auto' }}>
      <Form form={formRef} initialValues={settings}>
        <Form.Item name="forceHideEntry" label="" valuePropName="checked">
          <Popconfirm
            placement="topLeft"
            title={
              <div>
                <div>该操作将永久隐藏挂载在页面上的浮动入口，确认执行吗？</div>
                <div>复原方式：可通过删除localStorage中的_axiosAdapter.settings.forceHideEntry字段来复原</div>
              </div>
            }
            onConfirm={handleHideEntry}
            okText="隐藏"
            cancelText="取消">
            <Button>隐藏浮动图标</Button>
          </Popconfirm>
        </Form.Item>

        <Form.Item name="switch" label="启动本地缓存接口（测试慎用）" valuePropName="checked">
          <Switch onChange={(value) => { updateFields('switch', value); }} />
        </Form.Item>

        <Form.Item noStyle shouldUpdate={(prev, cur) => prev.switch !== cur.switch}>
          {({ getFieldValue }) => {
            const gSwitch = getFieldValue('switch');
            return !gSwitch && (
              <Form.Item
                name="saveSwitch"
                label="禁用时也记录接口返回"
              >
                <Switch onChange={(value) => { updateFields('saveSwitch', value); }} />
              </Form.Item>
            );
          }}
        </Form.Item>

        <Form.Item name="ignoreParams" label="忽略请求参数" valuePropName="checked">
          <Switch onChange={(value) => { updateFields('ignoreParams', value); }} />
        </Form.Item>

        <Form.Item name="includeSiteRegexp" label="匹配域名（正则表达式）">
          <Input onBlur={(event) => { updateFields('includeSiteRegexp', event.target.value); }} placeholder={'仅在匹配成功的域名下开启缓存'} />
        </Form.Item>

        <Form.Item name="excludeSiteRegexp" label="排除域名（正则表达式）">
          <Input onBlur={(event) => { updateFields('excludeSiteRegexp', event.target.value); }} placeholder={'在匹配成功的域名下关闭缓存，优先度高于[匹配域名]'} />
        </Form.Item>

        <Form.Item name="includeRegexp" label="匹配url（正则表达式）">
          <Input onBlur={(event) => { updateFields('includeRegexp', event.target.value); }} placeholder={'仅缓存url符合正则表达式的api'} />
        </Form.Item>

        <Form.Item name="excludeRegexp" label="排除url（正则表达式）">
          <Input onBlur={(event) => { updateFields('excludeRegexp', event.target.value); }} placeholder={'不缓存url符合正则表达式的api，优先度高于[匹配url]'} />
        </Form.Item>
      </Form>
    </div>
  );
}
