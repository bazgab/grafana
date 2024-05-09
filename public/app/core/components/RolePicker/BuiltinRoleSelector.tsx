import React from 'react';

import { SelectableValue } from '@grafana/data';
import { Icon, RadioButtonList, Tooltip, useStyles2, useTheme2, PopoverContent } from '@grafana/ui';
// @todo: replace barrel import path
import { OrgRole } from 'app/types/index';

import { getStyles } from './styles';

const BasicRoleOption: Array<SelectableValue<OrgRole>> = Object.values(OrgRole).map((r) => ({
  label: r === OrgRole.None ? 'No basic role' : r,
  value: r,
}));

interface Props {
  value?: OrgRole;
  onChange: (value: OrgRole) => void;
  disabled?: boolean;
  disabledMesssage?: string;
  tooltipMessage?: PopoverContent;
}

export const BuiltinRoleSelector = ({ value, onChange, disabled, disabledMesssage, tooltipMessage }: Props) => {
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  return (
    <>
      <div className={styles.groupHeader}>
        <span style={{ marginRight: theme.spacing(1) }}>Basic roles</span>
        {disabled && disabledMesssage && (
          <Tooltip placement="right-end" interactive={true} content={<div>{disabledMesssage}</div>}>
            <Icon name="question-circle" />
          </Tooltip>
        )}
        {!disabled && tooltipMessage && (
          <Tooltip placement="right-end" interactive={true} content={tooltipMessage}>
            <Icon name="info-circle" size="xs" />
          </Tooltip>
        )}
      </div>
      <RadioButtonList
        name="Basic Role Selector"
        className={styles.basicRoleSelector}
        options={BasicRoleOption}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </>
  );
};
