import React from 'react';

import Input from '@/src/shared/components/Input';

type ICustomFilterSectionProps = {};

const CustomFilterSection = (props: ICustomFilterSectionProps) => {
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      <Input placeholder="Property" />
      <Input placeholder="Value" />
    </div>
  );
};

export default CustomFilterSection;
