import React from 'react';
import { IBandRow } from '../../colorExpressionDialog';

const BandRow = ({
  index,
  bandRow
}: {
  index: number;

  bandRow: IBandRow;
}) => {
  console.log('bandRow', bandRow);
  return (
    <div style={{ display: 'flex' }}>
      <span>Band</span>
      <span>
        Band {bandRow.band}({bandRow.colorInterpretation})
      </span>
    </div>
  );
};

export default BandRow;
