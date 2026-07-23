import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Replaces any oklch(...), oklab(...), lab(...), lch(...) color functions in a CSS string with resolved rgb/rgba values.
 * Uses balanced parenthesis matching to correctly handle nested functions like var(--opacity, 1).
 */
export function replaceOklchInText(cssText: string): string {
  if (!cssText) return cssText;
  
  const lowerText = cssText.toLowerCase();
  if (!lowerText.includes('oklch') && !lowerText.includes('oklab') && !lowerText.includes('lab(') && !lowerText.includes('lch(')) {
    return cssText;
  }

  const temp = document.createElement('div');
  temp.style.display = 'none';
  document.body.appendChild(temp);

  const colorTriggers = ['oklch(', 'oklab(', 'lab(', 'lch('];
  let result = '';
  let i = 0;

  while (i < cssText.length) {
    let earliestPos = -1;
    let matchedTrigger = '';

    const lowerSub = cssText.toLowerCase();
    for (const trigger of colorTriggers) {
      const pos = lowerSub.indexOf(trigger, i);
      if (pos !== -1 && (earliestPos === -1 || pos < earliestPos)) {
        earliestPos = pos;
        matchedTrigger = trigger;
      }
    }

    if (earliestPos === -1) {
      result += cssText.slice(i);
      break;
    }

    result += cssText.slice(i, earliestPos);

    let depth = 0;
    let endPos = -1;
    for (let j = earliestPos; j < cssText.length; j++) {
      if (cssText[j] === '(') {
        depth++;
      } else if (cssText[j] === ')') {
        depth--;
        if (depth === 0) {
          endPos = j;
          break;
        }
      }
    }

    if (endPos !== -1) {
      const fullMatch = cssText.slice(earliestPos, endPos + 1);
      let convertedColor = 'rgb(128, 128, 128)';
      try {
        temp.style.color = '';
        temp.style.color = fullMatch;
        const computed = window.getComputedStyle(temp).color;
        if (computed && (computed.startsWith('rgb') || computed.startsWith('rgba'))) {
          convertedColor = computed;
        }
      } catch {
        convertedColor = 'rgb(128, 128, 128)';
      }
      result += convertedColor;
      i = endPos + 1;
    } else {
      result += 'rgb(128, 128, 128)';
      i = earliestPos + matchedTrigger.length;
    }
  }

  if (temp.parentNode) {
    temp.parentNode.removeChild(temp);
  }

  return result;
}

export function sanitizeCssText(cssText: string): string {
  return replaceOklchInText(cssText);
}

export async function fetchAndSanitizeStylesheet(href: string): Promise<string> {
  try {
    const response = await fetch(href);
    if (!response.ok) return '';
    const cssText = await response.text();
    return replaceOklchInText(cssText);
  } catch (err) {
    console.warn('PDF Generator: Failed to fetch stylesheet for sanitization:', href, err);
    return '';
  }
}

/**
 * Captures a DOM element and downloads it as a high-quality PDF document.
 * Fully compatible with Tailwind CSS v4 and oklch color models.
 * 
 * @param elementOrId HTMLElement reference or string ID of element to capture
 * @param filename File name for the output PDF (without .pdf extension)
 */
export async function downloadElementAsPdf(
  elementOrId: HTMLElement | string,
  filename: string = 'document'
): Promise<void> {
  try {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    
    if (!element) {
      console.warn('PDF Generator: Target element not found, launching print dialog fallback.');
      window.print();
      return;
    }

    // Capture element with html2canvas, with complete CSS sanitization in onclone
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      windowWidth: element.scrollWidth || 1024,
      onclone: async (clonedDoc, clonedElement) => {
        // 1. Process all external <link rel="stylesheet"> tags
        const linkTags = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
        
        await Promise.all(
          linkTags.map(async (link) => {
            const href = link.href;
            if (!href) return;

            let cssText = '';

            try {
              const matchingSheet = Array.from(document.styleSheets).find(s => s.href === href);
              if (matchingSheet) {
                try {
                  cssText = Array.from(matchingSheet.cssRules).map(r => r.cssText).join('\n');
                } catch {
                  // Cross-origin access block
                }
              }
            } catch {
              // styleSheets inspection error
            }

            if (!cssText) {
              cssText = await fetchAndSanitizeStylesheet(href);
            } else {
              cssText = replaceOklchInText(cssText);
            }

            if (cssText) {
              const styleTag = clonedDoc.createElement('style');
              styleTag.textContent = cssText;
              if (link.parentNode) {
                link.parentNode.replaceChild(styleTag, link);
              }
            }
          })
        );

        // 2. Process all <style> tags inside the cloned document
        const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
        styleTags.forEach((style) => {
          if (style.textContent) {
            style.textContent = replaceOklchInText(style.textContent);
          }
        });

        // 3. Process all inline style attributes on cloned elements
        const allClonedElements = Array.from(clonedDoc.querySelectorAll('*')) as HTMLElement[];
        allClonedElements.forEach((el) => {
          if (el.hasAttribute('style')) {
            const styleAttr = el.getAttribute('style');
            if (styleAttr) {
              el.setAttribute('style', replaceOklchInText(styleAttr));
            }
          }
        });

        // 4. Explicitly copy computed RGB styles to inline styles
        const originalNodes = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
        const clonedNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];

        for (let i = 0; i < originalNodes.length; i++) {
          const origNode = originalNodes[i];
          const clonedNode = clonedNodes[i];

          if (origNode && clonedNode && origNode.nodeType === Node.ELEMENT_NODE) {
            try {
              const cs = window.getComputedStyle(origNode);
              
              if (cs.color && cs.color.includes('rgb')) {
                clonedNode.style.color = cs.color;
              }
              if (
                cs.backgroundColor &&
                cs.backgroundColor.includes('rgb') &&
                cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                cs.backgroundColor !== 'transparent'
              ) {
                clonedNode.style.backgroundColor = cs.backgroundColor;
              }
              if (cs.borderColor && cs.borderColor.includes('rgb')) {
                clonedNode.style.borderColor = cs.borderColor;
              }
              if (cs.fill && cs.fill.includes('rgb')) {
                clonedNode.style.fill = cs.fill;
              }
              if (cs.stroke && cs.stroke.includes('rgb')) {
                clonedNode.style.stroke = cs.stroke;
              }
            } catch {
              // Ignore style read errors
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

    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
    pdf.save(`${safeFilename}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF file:', error);
    window.print();
  }
}
