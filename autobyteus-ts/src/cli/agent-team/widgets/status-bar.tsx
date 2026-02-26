import React from 'react';
import { Box, Text } from 'ink';

export const StatusBar: React.FC = () => {
  return (
    <Box marginTop={1}>
      <Text dimColor>↑/↓ select · q quit</Text>
    </Box>
  );
};
