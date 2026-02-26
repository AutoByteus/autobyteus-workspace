import React from 'react';
import { Box, Text } from 'ink';

export const Logo: React.FC = () => {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>
        <Text color="cyan" bold>
          Auto
        </Text>
        <Text color="magenta" bold>
          Byteus
        </Text>
      </Text>
      <Text dimColor>Orchestrating AI Agent Teams.</Text>
    </Box>
  );
};
