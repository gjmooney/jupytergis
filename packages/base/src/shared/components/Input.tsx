import { Input as InputPrimitive } from '@base-ui/react/input';
import * as React from 'react';

import { cn } from './utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn('jgis-input', className)}
      {...props}
    />
  );
}

export { Input };
