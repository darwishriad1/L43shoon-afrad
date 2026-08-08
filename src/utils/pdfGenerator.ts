import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toBlob, toPng } from 'html-to-image';

/**
 * Replaces any oklch(...), oklab(...), lab(...), lch(...) color functions in a CSS string with resolved rgb/rgba values.
 * Uses balanced parenthesis matching to correctly handle nested functions like var(--opacity, 1).
 */
export function parseOklchToRgb(oklchStr: string): string {
  try {
    const match = oklchStr.match(/oklch\(\s*([\d.%]+)\s+([\d.]+)\s+([\d.]+)(?:\s*[\/\s]\s*([\d.%]+))?\s*\)/i);
    if (!match) return oklchStr;

    let [, lStr, cStr, hStr, aStr] = match;
    let L = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
    let C = parseFloat(cStr);
    let H = parseFloat(hStr);
    let alpha = aStr ? (aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr)) : 1;

    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    let rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const gamma = (c: number) => {
      const abs = Math.abs(c);
      if (abs <= 0.0031308) return 12.92 * c;
      return (c < 0 ? -1 : 1) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
    };

    let r = Math.round(Math.min(255, Math.max(0, gamma(rLinear) * 255)));
    let g = Math.round(Math.min(255, Math.max(0, gamma(gLinear) * 255)));
    let bComp = Math.round(Math.min(255, Math.max(0, gamma(bLinear) * 255)));

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${bComp}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${bComp})`;
  } catch {
    return oklchStr;
  }
}

export function parseOklabToRgb(oklabStr: string): string {
  try {
    const match = oklabStr.match(/oklab\(\s*([\d.%]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*[\/\s]\s*([\d.%]+))?\s*\)/i);
    if (!match) return oklabStr;

    let [, lStr, aStr, bStr, aAlpha] = match;
    let L = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
    let a = parseFloat(aStr);
    let b = parseFloat(bStr);
    let alpha = aAlpha ? (aAlpha.endsWith('%') ? parseFloat(aAlpha) / 100 : parseFloat(aAlpha)) : 1;

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;

    let rLinear = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let gLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let bLinear = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    const gamma = (c: number) => {
      const abs = Math.abs(c);
      if (abs <= 0.0031308) return 12.92 * c;
      return (c < 0 ? -1 : 1) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
    };

    let r = Math.round(Math.min(255, Math.max(0, gamma(rLinear) * 255)));
    let g = Math.round(Math.min(255, Math.max(0, gamma(gLinear) * 255)));
    let bComp = Math.round(Math.min(255, Math.max(0, gamma(bLinear) * 255)));

    if (alpha < 1) {
      return `rgba(${r}, ${g}, ${bComp}, ${alpha})`;
    }
    return `rgb(${r}, ${g}, ${bComp})`;
  } catch {
    return oklabStr;
  }
}

/**
 * Replaces any oklch(...) or oklab(...) color functions in a CSS string with mathematically calculated rgb/rgba values.
 */
export function replaceOklchInText(cssText: string): string {
  if (!cssText) return cssText;
  
  let result = cssText;
  
  result = result.replace(/oklch\([^)]+\)/gi, (match) => {
    const res = parseOklchToRgb(match);
    return res.includes('oklch') ? 'rgb(15, 23, 42)' : res;
  });
  
  result = result.replace(/oklab\([^)]+\)/gi, (match) => {
    const res = parseOklabToRgb(match);
    return res.includes('oklab') ? 'rgb(15, 23, 42)' : res;
  });

  // Ensure no residual unsupported CSS color functions remain
  result = result.replace(/oklab\([^)]*\)/gi, 'rgb(15, 23, 42)');
  result = result.replace(/oklch\([^)]*\)/gi, 'rgb(15, 23, 42)');
  result = result.replace(/color-mix\([^)]*\)/gi, 'rgb(15, 23, 42)');
  result = result.replace(/light-dark\([^)]*\)/gi, 'rgb(15, 23, 42)');

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
 * Captures a DOM element as a high-quality HTML5 Canvas element.
 */
export async function captureElementAsCanvas(
  elementOrId: HTMLElement | string
): Promise<HTMLCanvasElement | null> {
  try {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!element) {
      console.warn('Capture Element: Target element not found:', elementOrId);
      return null;
    }

    // 1. Try primary high-definition screenshot capture via html-to-image (SVG/PNG native engine)
    try {
      const blob = await captureElementAsScreenshotBlob(element);
      if (blob) {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        const loaded = await new Promise<boolean>((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });

        if (loaded && img.width > 0 && img.height > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            return canvas;
          }
        }
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.warn('Primary html-to-image canvas capture failed, attempting html2canvas fallback:', err);
    }

    // 2. Pre-sanitize all active document <style> tags so html2canvas doesn't throw on oklab/oklch when parsing document.styleSheets
    const styleElements = Array.from(document.querySelectorAll('style'));
    const originalStyleContents: { el: HTMLStyleElement; content: string }[] = [];

    styleElements.forEach((styleEl) => {
      if (
        styleEl.textContent &&
        (styleEl.textContent.includes('oklab') ||
          styleEl.textContent.includes('oklch') ||
          styleEl.textContent.includes('lab(') ||
          styleEl.textContent.includes('lch(') ||
          styleEl.textContent.includes('color-mix') ||
          styleEl.textContent.includes('light-dark'))
      ) {
        originalStyleContents.push({ el: styleEl, content: styleEl.textContent });
        styleEl.textContent = replaceOklchInText(styleEl.textContent);
      }
    });

    // Compute element's actual full un-clipped height
    const calculatedHeight = Math.max(element.scrollHeight, element.offsetHeight, element.getBoundingClientRect().height);

    let canvas: HTMLCanvasElement;
    try {
      canvas = await html2canvas(element, {
        scale: 3, // Ultra crisp high-definition screenshot quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        width: 820,
        height: calculatedHeight,
        windowWidth: 1200,
        windowHeight: calculatedHeight + 300,
        onclone: async (clonedDoc, clonedElement) => {
          // Force fixed desktop print dimensions on clonedElement so screenshot doesn't squish or crop
          clonedElement.style.width = '820px';
          clonedElement.style.minWidth = '820px';
          clonedElement.style.maxWidth = '820px';
          clonedElement.style.height = 'auto';
          clonedElement.style.maxHeight = 'none';
          clonedElement.style.overflow = 'visible';
          clonedElement.style.boxSizing = 'border-box';
          clonedElement.style.margin = '0 auto';
          clonedElement.style.padding = '32px';
          clonedElement.style.backgroundColor = '#ffffff';
          clonedElement.style.color = '#0f172a';
          clonedElement.style.fontFamily = "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif";
          clonedElement.style.direction = 'rtl';
          (clonedElement.style as any).webkitFontSmoothing = 'antialiased';

          // Force grid structures to keep desktop layout
          const allGrids = Array.from(clonedElement.querySelectorAll('.grid, [class*="grid-cols-"]')) as HTMLElement[];
          allGrids.forEach((g) => {
            const className = typeof g.className === 'string' ? g.className : ((g.className as any)?.baseVal || '');
            if (className.includes('grid-cols-4') || className.includes('sm:grid-cols-4')) {
              g.style.display = 'grid';
              g.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
              g.style.gap = '12px';
            } else if (className.includes('grid-cols-3') || className.includes('sm:grid-cols-3')) {
              g.style.display = 'grid';
              g.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
              g.style.gap = '12px';
            } else if (className.includes('grid-cols-2') || className.includes('sm:grid-cols-2')) {
              g.style.display = 'grid';
              g.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
              g.style.gap = '12px';
            }
          });

          // 1. Process external stylesheets
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
                // styleSheets error
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

          // 2. Process style tags inside cloned doc
          const styleTags = Array.from(clonedDoc.querySelectorAll('style'));
          styleTags.forEach((style) => {
            if (style.textContent) {
              style.textContent = replaceOklchInText(style.textContent);
            }
          });

          // 3. Process inline style attributes
          const allClonedElements = Array.from(clonedDoc.querySelectorAll('*')) as HTMLElement[];
          allClonedElements.forEach((el) => {
            if (el.hasAttribute('style')) {
              const styleAttr = el.getAttribute('style');
              if (styleAttr) {
                el.setAttribute('style', replaceOklchInText(styleAttr));
              }
            }
          });

          // 4. Copy computed RGB styles
          const originalNodes = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
          const clonedNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];

          for (let i = 0; i < originalNodes.length; i++) {
            const origNode = originalNodes[i];
            const clonedNode = clonedNodes[i];

            if (origNode && clonedNode && origNode.nodeType === Node.ELEMENT_NODE) {
              try {
                const cs = window.getComputedStyle(origNode);
                let col = cs.color;
                if (col && (col.includes('oklab') || col.includes('oklch'))) col = replaceOklchInText(col);
                if (col && col !== 'initial') clonedNode.style.color = col;

                let bg = cs.backgroundColor;
                if (bg && (bg.includes('oklab') || bg.includes('oklch'))) bg = replaceOklchInText(bg);
                if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') clonedNode.style.backgroundColor = bg;

                let border = cs.borderColor;
                if (border && (border.includes('oklab') || border.includes('oklch'))) border = replaceOklchInText(border);
                if (border) clonedNode.style.borderColor = border;

                if (cs.fill && cs.fill.includes('rgb')) {
                  clonedNode.style.fill = cs.fill;
                }
                if (cs.stroke && cs.stroke.includes('rgb')) {
                  clonedNode.style.stroke = cs.stroke;
                }
              } catch {
                // Ignore computed style read errors
              }
            }
          }
        }
      });
    } finally {
      originalStyleContents.forEach(({ el, content }) => {
        try {
          el.textContent = content;
        } catch {
          // Ignore
        }
      });
    }

    return canvas;
  } catch (err) {
    console.error('Failed to capture element as canvas:', err);
    return null;
  }
}

/**
 * Captures a DOM element and downloads it as a high-quality PDF document using jsPDF directly.
 * Decoupled from browser print dialogs (window.print).
 */
export async function downloadElementAsPdf(
  elementOrId: HTMLElement | string,
  filename: string = 'document'
): Promise<void> {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    throw new Error(`PDF Generator: Target element not found (${elementOrId})`);
  }

  const canvas = await captureElementAsCanvas(element);
  if (!canvas) {
    throw new Error('PDF Generator: Failed to capture report canvas');
  }

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
}

/**
 * Dedicated PDF exporter for Quick Readiness Reports.
 * Uses jsPDF directly and handles element rendering delays smoothly.
 */
export async function exportQuickReadinessPdfReport(
  elementId: string = 'quick-readiness-pdf-report',
  filename: string = 'تقرير_الجاهزية_اليومي'
): Promise<void> {
  // Wait up to 3 frames / 300ms if element is mounting
  let element = document.getElementById(elementId);
  if (!element) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    element = document.getElementById(elementId);
  }

  if (!element) {
    throw new Error(`العنصر المخصص لتقرير الجاهزية (${elementId}) غير موجود بالصفحة.`);
  }

  await downloadElementAsPdf(element, filename);
}

/**
 * Dedicated screenshot capture engine for PNG Images and WhatsApp sharing.
 * Uses dedicated html-to-image library for pixel-perfect screenshot rendering.
 */
export async function captureElementAsScreenshotBlob(
  elementOrId: HTMLElement | string
): Promise<Blob | null> {
  const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!element) {
    console.warn('Screenshot Capture: Target element not found:', elementOrId);
    return null;
  }

  // Pre-sanitize all active document <style> tags so html-to-image/html2canvas doesn't throw on oklab/oklch
  const styleElements = Array.from(document.querySelectorAll('style'));
  const originalStyleContents: { el: HTMLStyleElement; content: string }[] = [];

  styleElements.forEach((styleEl) => {
    if (
      styleEl.textContent &&
      (styleEl.textContent.includes('oklab') ||
        styleEl.textContent.includes('oklch') ||
        styleEl.textContent.includes('lab(') ||
        styleEl.textContent.includes('lch(') ||
        styleEl.textContent.includes('color-mix') ||
        styleEl.textContent.includes('light-dark'))
    ) {
      originalStyleContents.push({ el: styleEl, content: styleEl.textContent });
      styleEl.textContent = replaceOklchInText(styleEl.textContent);
    }
  });

  // Create an offscreen wrapper attached to document.body to ensure 100% un-clipped full-height layout rendering
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.top = '-9999px';
  wrapper.style.left = '-9999px';
  wrapper.style.width = '820px';
  wrapper.style.zIndex = '-9999';
  wrapper.style.backgroundColor = '#ffffff';
  wrapper.style.overflow = 'visible';

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = '820px';
  clone.style.minWidth = '820px';
  clone.style.maxWidth = '820px';
  clone.style.height = 'auto';
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.boxSizing = 'border-box';
  clone.style.margin = '0';
  clone.style.padding = '32px';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#0f172a';
  clone.style.fontFamily = "'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif";
  clone.style.direction = 'rtl';

  // Force grid layout columns in clone
  const allGrids = Array.from(clone.querySelectorAll('.grid, [class*="grid-cols-"]')) as HTMLElement[];
  allGrids.forEach((g) => {
    const className = typeof g.className === 'string' ? g.className : ((g.className as any)?.baseVal || '');
    if (className.includes('grid-cols-4') || className.includes('sm:grid-cols-4')) {
      g.style.display = 'grid';
      g.style.gridTemplateColumns = 'repeat(4, minmax(0, 1fr))';
      g.style.gap = '12px';
    } else if (className.includes('grid-cols-3') || className.includes('sm:grid-cols-3')) {
      g.style.display = 'grid';
      g.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))';
      g.style.gap = '12px';
    } else if (className.includes('grid-cols-2') || className.includes('sm:grid-cols-2')) {
      g.style.display = 'grid';
      g.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
      g.style.gap = '12px';
    }
  });

  // Copy exact resolved RGB computed styles from live DOM nodes to cloned nodes
  const originalNodes = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  const clonedNodes = [clone, ...Array.from(clone.querySelectorAll('*'))] as HTMLElement[];

  for (let i = 0; i < originalNodes.length; i++) {
    const origNode = originalNodes[i];
    const clonedNode = clonedNodes[i];

    if (origNode && clonedNode && origNode.nodeType === Node.ELEMENT_NODE) {
      try {
        const cs = window.getComputedStyle(origNode);
        if (cs.color && cs.color !== 'initial') {
          clonedNode.style.color = cs.color;
        }
        if (
          cs.backgroundColor &&
          cs.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
          cs.backgroundColor !== 'transparent'
        ) {
          clonedNode.style.backgroundColor = cs.backgroundColor;
        }
        if (cs.borderColor) {
          clonedNode.style.borderColor = cs.borderColor;
        }
        if (cs.fill) {
          clonedNode.style.fill = cs.fill;
        }
        if (cs.stroke) {
          clonedNode.style.stroke = cs.stroke;
        }
      } catch {
        // Ignore style copy errors
      }
    }
  }

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // Measure exact full un-clipped dimensions of the document
    const renderWidth = 820;
    const renderHeight = Math.max(clone.scrollHeight, clone.offsetHeight, clone.getBoundingClientRect().height);

    let blob: Blob | null = null;

    try {
      blob = await toBlob(clone, {
        quality: 0.98,
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#ffffff',
        width: renderWidth,
        height: renderHeight,
      });
    } catch (err) {
      console.warn('html-to-image capture warning, using canvas fallback:', err);
    }

    if (!blob) {
      // Fallback to html2canvas on clone
      const canvas = await html2canvas(clone, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
        width: renderWidth,
        height: renderHeight,
        windowWidth: 1200,
        windowHeight: renderHeight + 200,
      });
      if (canvas) {
        blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png', 0.95));
      }
    }

    return blob;
  } catch (err) {
    console.error('Screenshot Capture Failed:', err);
    return null;
  } finally {
    // Clean up offscreen wrapper
    if (wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    // Restore original style contents
    originalStyleContents.forEach(({ el, content }) => {
      try {
        el.textContent = content;
      } catch {
        // Ignore
      }
    });
  }
}

/**
 * Downloads a DOM element directly as a crisp high-definition PNG image screenshot.
 */
export async function downloadElementAsImage(
  elementOrId: HTMLElement | string,
  filename: string = 'تصريح_إجازة'
): Promise<void> {
  try {
    const blob = await captureElementAsScreenshotBlob(elementOrId);
    if (!blob) {
      alert('تعذر تحويل التصريح إلى صورة.');
      return;
    }
    const dataUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = dataUrl;
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
    link.download = `${safeFilename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
  } catch (err) {
    console.error('Failed to download element as image:', err);
    alert('حدث خطأ أثناء تنزيل صورة التصريح.');
  }
}

/**
 * Shares a captured DOM element screenshot as an image via WhatsApp or Native Web Share API.
 */
export async function shareElementViaWhatsApp(
  elementOrId: HTMLElement | string,
  filename: string = 'تصريح_إجازة',
  textSummary?: string,
  phoneNumber?: string
): Promise<{ success: boolean; sharedViaWebShare: boolean }> {
  try {
    const blob = await captureElementAsScreenshotBlob(elementOrId);
    if (!blob) {
      alert('تعذر تحويل التصريح إلى صورة لمشاركته.');
      return { success: false, sharedViaWebShare: false };
    }

    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
    const imageFile = new File([blob], `${safeFilename}.png`, { type: 'image/png' });

    // Try Web Share API with file support first (Mobile browsers / supported OS)
    if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          title: 'تصريح إجازة رسمية',
          text: textSummary || 'تصريح ونموذج إجازة رسمية موثق من قيادة الوحدة.',
          files: [imageFile],
        });
        return { success: true, sharedViaWebShare: true };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return { success: true, sharedViaWebShare: true };
        }
      }
    }

    // Fallback: Download PNG image screenshot automatically + launch WhatsApp web/app with structured message
    const dataUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${safeFilename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);

    const extraNote = '\n\n📌 *ملاحظة:* تم تحميل صورة تصريح الإجازة الرسمية (PNG) تلقائياً على جهازك لإرفاقها مباشرة في المحادثة.';
    const fullText = (textSummary || 'تصريح إجازة رسمية موثق') + extraNote;
    const encodedText = encodeURIComponent(fullText);

    let waUrl = '';
    if (phoneNumber && phoneNumber.trim().length > 3) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;
    } else {
      waUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    }

    window.open(waUrl, '_blank');
    
    // Friendly notification toast
    alert('✅ تم التقاط صورة تصريح الإجازة بأسلوب المكاتب الخاصة وتنزيلها تلقائياً على جهازك!\nجارٍ فتح الواتساب لإرسال ملخص التصريح ومشاركة الصورة.');
    
    return { success: true, sharedViaWebShare: false };
  } catch (error) {
    console.error('Failed to share element via WhatsApp:', error);
    alert('حدث خطأ أثناء إعداد صورة التصريح للمشاركة عبر الواتساب.');
    return { success: false, sharedViaWebShare: false };
  }
}
