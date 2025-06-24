import React, { useState } from 'react';

import { Button } from '@/src/shared/components/Button';
import Input from '@/src/shared/components/Input';
import { StacFilterOperator } from '../types/types';

type ICustomFilterSectionProps = {
  handleAddCustomFilter: (
    property: string,
    operator: StacFilterOperator,
    value: string,
  ) => void;
};

const CustomFilterSection = ({
  handleAddCustomFilter,
}: ICustomFilterSectionProps) => {
  const [property, setProperty] = useState('');
  const [operator, setOperator] = useState('');
  const [value, setValue] = useState('');

  const handleAddFilter = () => {
    handleAddCustomFilter(property, operator as StacFilterOperator, value);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <Input
          placeholder="Property"
          value={property}
          defaultValue={'eo:cloud_cover'}
          onChange={e => setProperty(e.target.value)}
        />
        <select
          value={operator}
          onChange={e => setOperator(e.target.value)}
          style={{ padding: '0.25rem' }}
          defaultValue={'<='}
        >
          <option value="" disabled>
            Select operator
          </option>
          <option value="=">=</option>
          <option value="!=">!=</option>
          <option value="<">{'<'}</option>
          <option value="<=">{'<='}</option>
          <option value=">">{'>'}</option>
          <option value=">=">{'>='}</option>
          <option value="startsWith">startsWith</option>
          <option value="endsWith">endsWith</option>
          <option value="contains">contains</option>
          <option value="in">in</option>
        </select>
        <Input
          placeholder="Value"
          value={value}
          onChange={e => setValue(e.target.value)}
          defaultValue={'95'}
        />
      </div>
      {/* ? icon button? */}
      <Button variant="secondary" size="sm" onClick={handleAddFilter}>
        Add Filter
      </Button>
    </div>
  );
};

export default CustomFilterSection;
