import { EyeClosedIcon, EyeOpenIcon } from '@radix-ui/react-icons';
import * as React from 'react';

import { Button } from './Button';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onPasswordVisible?: (name: string) => void;
}

const Input = React.forwardRef<HTMLInputElement, IInputProps>(
  ({ type, className, onPasswordVisible, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);

    function handlePasswordEye() {
      setIsVisible(prevState => !prevState);
      if (isVisible && onPasswordVisible) {
        onPasswordVisible(props.name || '');
      }
    }

    if (type === 'password') {
      return (
        <div style={{ position: 'relative', width: 'max-content' }}>
          <input
            ref={ref}
            type={type}
            className={`${'Input'} ${className}`}
            {...props}
          />
          {type === 'password' ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handlePasswordEye}
              className={'passwordButton'}
            >
              {isVisible ? <EyeOpenIcon /> : <EyeClosedIcon />}
            </Button>
          ) : null}
        </div>
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={`${'Input'} ${className}`}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export default Input;
