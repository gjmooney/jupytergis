// import React, { useEffect, useRef, useState } from 'react';
// import ValueSelect from './lego/ValueSelect';
// import { IStopRow, ISymbologyDialogProps } from '../../../symbologyDialog';
// import { useGetProperties } from './useGetProperties';
// import ColorRamp from '../ColorRamp';
// import StopContainer from './lego/StopContainer';
// import { VectorUtils } from '../symbologyUtils';

// const Categorized = ({
//   context,
//   state,
//   okSignalPromise,
//   cancel,
//   layerId
// }: ISymbologyDialogProps) => {
//   const selectedValueRef = useRef<string>();

//   const [selectedValue, setSelectedValue] = useState('');
//   const [stopRows, setStopRows] = useState<IStopRow[]>([]);
//   if (!layerId) {
//     return;
//   }
//   const layer = context.model.getLayer(layerId);
//   if (!layer?.parameters) {
//     return;
//   }
//   const { featureProps } = useGetProperties({
//     layerId,
//     model: context.model
//   });

//   useEffect(() => {
//     const valueColorPairs = VectorUtils.buildColorInfo(layer);

//     setStopRows(valueColorPairs);

//     okSignalPromise.promise.then(okSignal => {
//       okSignal.connect(handleOk, this);
//     });

//     return () => {
//       okSignalPromise.promise.then(okSignal => {
//         okSignal.disconnect(handleOk, this);
//       });
//     };
//   }, []);

//   return (
//     <div className="jp-gis-layer-symbology-container">
//       <ValueSelect
//         featureProperties={featureProps}
//         selectedValue={selectedValue}
//         setSelectedValue={setSelectedValue}
//       />

//       <ColorRamp
//         layerId={layerId}
//         modeOptions={modeOptions}
//         classifyFunc={buildColorInfoFromClassification}
//       />
//       <StopContainer
//         selectedMethod={selectedMethod}
//         stopRows={stopRows}
//         setStopRows={setStopRows}
//       />
//     </div>
//   );
// };

// export default Categorized;
