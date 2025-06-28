import React from 'react';
import { styled } from '@mui/material/styles';
import { keyframes } from '@mui/system';

const float1 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(80px, 60px) scale(1.15); }
  100% { transform: translate(0, 0) scale(1); }
`;
const float2 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-60px, 100px) scale(1.1); }
  100% { transform: translate(0, 0) scale(1); }
`;
const float3 = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(100px, -80px) scale(1.12); }
  100% { transform: translate(0, 0) scale(1); }
`;

const Blob = styled('div')({
  position: 'absolute',
  borderRadius: '50%',
  filter: 'blur(70px)',
  opacity: 0.7,
  zIndex: 0,
  pointerEvents: 'none',
});

const Blob1 = styled(Blob)({
  width: 420,
  height: 420,
  background: 'radial-gradient(circle, #fff 0%, #bbb 80%)',
  top: -120,
  left: -120,
  animation: `${float1} 14s ease-in-out infinite`,
});
const Blob2 = styled(Blob)({
  width: 340,
  height: 340,
  background: 'radial-gradient(circle, #e5e5e5 0%, #222 90%)',
  bottom: 60,
  right: 80,
  animation: `${float2} 18s ease-in-out infinite`,
});
const Blob3 = styled(Blob)({
  width: 300,
  height: 300,
  background: 'radial-gradient(circle, #fff 0%, #444 90%)',
  top: 160,
  right: 160,
  animation: `${float3} 20s ease-in-out infinite`,
});

const AnimatedBackground = () => (
  <>
    <Blob1 />
    <Blob2 />
    <Blob3 />
  </>
);

export default AnimatedBackground;
