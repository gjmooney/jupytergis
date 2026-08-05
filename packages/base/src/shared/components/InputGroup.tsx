import * as React from 'react';

import { cn } from './utils';
import { Button, type ButtonProps } from './Button';
import { Input } from './Input';

function InputGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn('jgis-input-group', className)}
      {...props}
    />
  );
}

type InputGroupAddonAlign =
  | 'inline-start'
  | 'inline-end'
  | 'block-start'
  | 'block-end';

function InputGroupAddon({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & {
  align?: InputGroupAddonAlign;
}) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn('jgis-input-group-addon', className)}
      onClick={e => {
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        e.currentTarget.parentElement?.querySelector('input')?.focus();
      }}
      {...props}
    />
  );
}

type InputGroupButtonSize = 'xs' | 'sm' | 'icon-xs' | 'icon-sm';

function InputGroupButton({
  className,
  type = 'button',
  variant = 'ghost',
  size = 'xs',
  ...props
}: Omit<ButtonProps, 'size' | 'type'> & {
  type?: 'button' | 'submit' | 'reset';
  size?: InputGroupButtonSize;
}) {
  return (
    <Button
      type={type}
      data-size={size}
      variant={variant}
      className={cn('jgis-input-group-button', className)}
      {...props}
    />
  );
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('jgis-input-group-text', className)} {...props} />;
}

function InputGroupInput({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <Input
      data-slot="input-group-control"
      className={cn('jgis-input-group-input', className)}
      {...props}
    />
  );
}

export {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
};
