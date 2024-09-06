import React from 'react';
import { IBandRow } from './SingleBandPseudoColor';

const BandRow = ({
  index,
  bandRow,
  bandRows,
  setSelectedBand
}: {
  index: number;
  bandRow: IBandRow;
  bandRows: IBandRow[];
  setSelectedBand: any;
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span>Band</span>
      <span>
        <select
          className="jp-mod-styled jp-SchemaForm"
          onChange={event => setSelectedBand(event.target.value)}
        >
          {bandRows.map((band, bandIndex) => (
            <option
              key={bandIndex}
              value={band.band}
              selected={band.band === bandRow.band}
            >
              {`Band ${band.band} (${band.colorInterpretation})`}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
};

export default BandRow;
