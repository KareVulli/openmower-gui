import styled from "styled-components";

export const StyledTerminal = styled.div`
  div.react-terminal-wrapper {
    padding: 0px;
    font-size: 14px;
  }

  div.react-terminal-line:before {
    content: none;
  }

  div.react-terminal-wrapper > div.react-terminal-window-buttons {
    display: none;
  }
`;