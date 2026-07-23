import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Helper to convert any oklch(...) or modern color function string to rgb(...) using browser's computed style engine
 */
function convertOklchToRgb(cssText: string): string {
  if (!cssText || !cssText.includes('oklch')) {
    return cssText;
  }

  // Create a single dummy element for color evaluation
  const temp = document.createElement('div');
  temp.style.display = 'none';
  document.body.appendChild(temp);

  const converted = cssText.replace(/oklch\([^)]+\)/gi, (match) => {
    try {
      temp.style.color = match;
      const computedColor = window.getComputedStyle(temp).color;
      return computedColor && computedColor !== '' ? computedColor : 'rgb(100, 100, 100)';
    } catch {
      return 'rgb(100, 100, 100)';
    }
  });

  document.body.removeChild(temp);
  return converted;
}

/**
 * Downloads a specific DOM element as a downloadable PDF file.
 * @param elementOrId HTMLElement reference or string ID of element to capture
 * @param filename File name for the output PDF (without .pdf extension)
 */
export async function downloadElementAsPdf(elementOrId: HTMLElement | string, filename: string = 'document'): Promise<void> {
  try {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    
    if (!element) {
      console.warn('PDF Generator: Element not found, launching print dialog fallback.');
      window.print();
      return;
    }

    // Capture element with html2canvas using onclone pre-processing for Tailwind v4 / oklch compatibility
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      windowWidth: element.scrollWidth || 1024,
      onclone: (clonedDoc, clonedElement) => {
        // 1. Sanitize all <style> tags in cloned document
        const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
        styleTags.forEach((styleTag) => {
          if (styleTag.textContent && styleTag.textContent.includes('oklch')) {
            styleTag.textContent = convertOklchToRgb(styleTag.textContent);
          }
        });

        // 2. Explicitly copy computed RGB colors to inline styles for element and all children
        const originalNodes = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
        const clonedNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];

        for (let i = 0; i < originalNodes.length; i++) {
          const origNode = originalNodes[i];
          const clonedNode = clonedNodes[i];

          if (origNode && clonedNode && origNode.nodeType === Node.ELEMENT_NODE) {
            try {
              const cs = window.getComputedStyle(origNode);
              
              // Force computed rgb/rgba colors on cloned inline style
              if (cs.color && cs.color.includes('rgb')) {
                clonedNode.style.color = cs.color;
              }
              if (cs.backgroundColor && cs.backgroundColor.includes('rgb') && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') {
                clonedNode.style.backgroundColor = cs.backgroundColor;
              }
              if (cs.borderColor && cs.borderColor.includes('rgb')) {
                clonedNode.style.borderColor = cs.borderColor;
              }
            } catch {
              // Ignore any individual style read errors
            }
          }
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const pdfWidth = 210; // A4 width in mm
    const pdfPageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfPageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfPageHeight;
    }

    // Clean file name string
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
    pdf.save(`${safeFilename}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF file, falling back to window.print():', error);
    // Graceful fallback to browser print dialog
    window.print();
  }
}
