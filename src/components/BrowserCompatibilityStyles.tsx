
import React from "react";

export const BrowserCompatibilityStyles = () => {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      /* Firefox specific styles */
      @-moz-document url-prefix() {
        .audio-player {
          min-width: 250px;
        }
      }

      /* Safari specific styles */
      @media not all and (min-resolution:.001dpcm) { 
        @supports (-webkit-appearance:none) {
          .safari-flex-fix {
            display: -webkit-box;
            -webkit-box-align: center;
          }
        }
      }

      /* Edge/Chrome specific styles */
      @supports (-ms-ime-align:auto) {
        .edge-fix {
          min-height: 40px;
        }
      }
      
      /* General cross-browser improvements */
      audio::-webkit-media-controls-panel {
        background-color: #333;
      }
      
      audio::-webkit-media-controls-play-button {
        background-color: #555;
        border-radius: 50%;
      }
      
      audio::-moz-range-thumb {
        background: #555;
      }
      
      audio::-ms-thumb {
        background: #555;
      }
    ` }} />
  );
};
