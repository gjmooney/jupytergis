import { JupyterGISDoc } from '@jupytergis/schema';

export class JupyterGisJsonDoc extends JupyterGISDoc {
  constructor() {
    super();
  }

  get version(): string {
    return '0.1.0';
  }

  static create(): JupyterGisJsonDoc {
    return new JupyterGisJsonDoc();
  }

  editable = false;
}
