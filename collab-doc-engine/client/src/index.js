import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/* ── Global styles — Word-like editor ── */
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f0f2f5;
    transition: background 0.2s;
  }

  /* ── Quill toolbar — Word ribbon style ── */
  .ql-toolbar.ql-snow {
    border: none !important;
    border-bottom: 1px solid #d0d0d0 !important;
    background: #f3f3f3 !important;
    padding: 6px 12px !important;
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 2px !important;
    align-items: center !important;
    position: sticky !important;
    top: 0 !important;
    z-index: 20 !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.08) !important;
  }

  /* Toolbar button groups */
  .ql-toolbar.ql-snow .ql-formats {
    margin-right: 6px !important;
    padding-right: 6px !important;
    border-right: 1px solid #d0d0d0 !important;
    display: flex !important;
    align-items: center !important;
    gap: 1px !important;
  }
  .ql-toolbar.ql-snow .ql-formats:last-child {
    border-right: none !important;
  }

  /* Toolbar buttons */
  .ql-toolbar.ql-snow button {
    width: 28px !important;
    height: 28px !important;
    border-radius: 4px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: background 0.1s !important;
    padding: 3px !important;
  }
  .ql-toolbar.ql-snow button:hover {
    background: #d8d8d8 !important;
  }
  .ql-toolbar.ql-snow button.ql-active {
    background: #c7d9f5 !important;
    color: #1a5fb4 !important;
  }
  .ql-toolbar.ql-snow button.ql-active .ql-stroke {
    stroke: #1a5fb4 !important;
  }
  .ql-toolbar.ql-snow button.ql-active .ql-fill {
    fill: #1a5fb4 !important;
  }

  /* Pickers (font, size, header) */
  .ql-toolbar.ql-snow .ql-picker {
    height: 28px !important;
    border-radius: 4px !important;
    border: 1px solid #c8c8c8 !important;
    background: #fff !important;
    font-size: 12px !important;
  }
  .ql-toolbar.ql-snow .ql-picker:hover {
    border-color: #999 !important;
  }
  .ql-toolbar.ql-snow .ql-font-picker { width: 120px !important; }
  .ql-toolbar.ql-snow .ql-size-picker { width: 70px !important; }
  .ql-toolbar.ql-snow .ql-header-picker,
  .ql-toolbar.ql-snow .ql-header { width: 110px !important; }

  .ql-toolbar.ql-snow .ql-picker-label {
    padding: 0 8px !important;
    font-size: 12px !important;
    color: #333 !important;
    display: flex !important;
    align-items: center !important;
    height: 100% !important;
  }
  .ql-toolbar.ql-snow .ql-picker-options {
    border-radius: 6px !important;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15) !important;
    border: 1px solid #d0d0d0 !important;
    background: #fff !important;
    z-index: 1000 !important;
    max-height: 240px !important;
    overflow-y: auto !important;
  }
  .ql-toolbar.ql-snow .ql-picker-item:hover {
    background: #e8f0fe !important;
    color: #1a5fb4 !important;
  }

  /* Color pickers */
  .ql-toolbar.ql-snow .ql-color-picker .ql-picker-label,
  .ql-toolbar.ql-snow .ql-background .ql-picker-label {
    width: 28px !important;
    padding: 2px 4px !important;
  }

  /* ── Quill container ── */
  .ql-container.ql-snow {
    border: none !important;
    font-size: 12pt !important;
    font-family: 'Calibri', 'Segoe UI', sans-serif !important;
    background: #f0f2f5 !important;
  }

  /* ── Editor area — A4 page look ── */
  .ql-editor {
    min-height: 1056px !important;   /* A4 at 96dpi */
    max-width: 816px !important;     /* Letter width */
    margin: 24px auto !important;
    padding: 96px 96px !important;   /* 1-inch margins */
    background: #ffffff !important;
    box-shadow: 0 1px 8px rgba(0,0,0,0.12), 0 4px 24px rgba(0,0,0,0.06) !important;
    border-radius: 2px !important;
    line-height: 1.6 !important;
    color: #000 !important;
    font-family: 'Calibri', 'Segoe UI', sans-serif !important;
    font-size: 12pt !important;
    outline: none !important;
  }

  .ql-editor.ql-blank::before {
    color: #bbb !important;
    font-style: normal !important;
    font-size: 12pt !important;
    left: 96px !important;
  }

  /* Headings */
  .ql-editor h1 { font-size: 26pt !important; font-weight: 700 !important; color: #1f3864 !important; margin-bottom: 8px !important; }
  .ql-editor h2 { font-size: 20pt !important; font-weight: 600 !important; color: #2e4057 !important; margin-bottom: 6px !important; }
  .ql-editor h3 { font-size: 16pt !important; font-weight: 600 !important; color: #374151 !important; margin-bottom: 4px !important; }
  .ql-editor h4 { font-size: 14pt !important; font-weight: 600 !important; }
  .ql-editor h5 { font-size: 12pt !important; font-weight: 600 !important; }
  .ql-editor h6 { font-size: 11pt !important; font-weight: 600 !important; color: #666 !important; }

  /* Paragraph spacing */
  .ql-editor p { margin-bottom: 6px !important; }

  /* Lists */
  .ql-editor ol, .ql-editor ul { padding-left: 2em !important; }
  .ql-editor li { margin-bottom: 3px !important; }

  /* Blockquote */
  .ql-editor blockquote {
    border-left: 4px solid #1a5fb4 !important;
    padding: 8px 16px !important;
    margin: 12px 0 !important;
    background: #f0f4ff !important;
    color: #374151 !important;
    font-style: italic !important;
    border-radius: 0 6px 6px 0 !important;
  }

  /* Code block */
  .ql-editor pre.ql-syntax {
    background: #1e1e2e !important;
    color: #cdd6f4 !important;
    border-radius: 8px !important;
    padding: 16px !important;
    font-family: 'Consolas', 'Courier New', monospace !important;
    font-size: 11pt !important;
    margin: 12px 0 !important;
    overflow-x: auto !important;
  }

  /* Inline code */
  .ql-editor code {
    background: #f0f0f0 !important;
    padding: 1px 5px !important;
    border-radius: 3px !important;
    font-family: 'Consolas', monospace !important;
    font-size: 10.5pt !important;
    color: #c7254e !important;
  }

  /* Links */
  .ql-editor a { color: #1a5fb4 !important; text-decoration: underline !important; }

  /* Custom fonts — class names match Font.whitelist values */
  .ql-font-arial     { font-family: Arial, sans-serif !important; }
  .ql-font-calibri   { font-family: Calibri, 'Segoe UI', sans-serif !important; }
  .ql-font-times     { font-family: 'Times New Roman', Times, serif !important; }
  .ql-font-georgia   { font-family: Georgia, serif !important; }
  .ql-font-verdana   { font-family: Verdana, sans-serif !important; }
  .ql-font-tahoma    { font-family: Tahoma, sans-serif !important; }
  .ql-font-trebuchet { font-family: 'Trebuchet MS', sans-serif !important; }
  .ql-font-courier   { font-family: 'Courier New', Courier, monospace !important; }
  .ql-font-serif     { font-family: Georgia, 'Times New Roman', serif !important; }
  .ql-font-monospace { font-family: 'Consolas', 'Courier New', monospace !important; }

  /* Font picker — show actual font name labels in dropdown */
  .ql-font .ql-picker-item[data-value="arial"]::before,
  .ql-font .ql-picker-label[data-value="arial"]::before     { content: 'Arial'; font-family: Arial, sans-serif; }
  .ql-font .ql-picker-item[data-value="calibri"]::before,
  .ql-font .ql-picker-label[data-value="calibri"]::before   { content: 'Calibri'; font-family: Calibri, 'Segoe UI', sans-serif; }
  .ql-font .ql-picker-item[data-value="times"]::before,
  .ql-font .ql-picker-label[data-value="times"]::before     { content: 'Times New Roman'; font-family: 'Times New Roman', serif; }
  .ql-font .ql-picker-item[data-value="georgia"]::before,
  .ql-font .ql-picker-label[data-value="georgia"]::before   { content: 'Georgia'; font-family: Georgia, serif; }
  .ql-font .ql-picker-item[data-value="verdana"]::before,
  .ql-font .ql-picker-label[data-value="verdana"]::before   { content: 'Verdana'; font-family: Verdana, sans-serif; }
  .ql-font .ql-picker-item[data-value="tahoma"]::before,
  .ql-font .ql-picker-label[data-value="tahoma"]::before    { content: 'Tahoma'; font-family: Tahoma, sans-serif; }
  .ql-font .ql-picker-item[data-value="trebuchet"]::before,
  .ql-font .ql-picker-label[data-value="trebuchet"]::before { content: 'Trebuchet MS'; font-family: 'Trebuchet MS', sans-serif; }
  .ql-font .ql-picker-item[data-value="courier"]::before,
  .ql-font .ql-picker-label[data-value="courier"]::before   { content: 'Courier New'; font-family: 'Courier New', monospace; }
  .ql-font .ql-picker-item[data-value="serif"]::before,
  .ql-font .ql-picker-label[data-value="serif"]::before     { content: 'Serif'; font-family: Georgia, serif; }
  .ql-font .ql-picker-item[data-value="monospace"]::before,
  .ql-font .ql-picker-label[data-value="monospace"]::before { content: 'Monospace'; font-family: 'Courier New', monospace; }
  /* Default (no value) */
  .ql-font .ql-picker-item:not([data-value])::before,
  .ql-font .ql-picker-label:not([data-value])::before,
  .ql-font .ql-picker-item[data-value=""]::before,
  .ql-font .ql-picker-label[data-value=""]::before          { content: 'Default Font'; }

  /* Size picker labels */
  .ql-size .ql-picker-item[data-value="8px"]::before,
  .ql-size .ql-picker-label[data-value="8px"]::before   { content: '8'; }
  .ql-size .ql-picker-item[data-value="9px"]::before,
  .ql-size .ql-picker-label[data-value="9px"]::before   { content: '9'; }
  .ql-size .ql-picker-item[data-value="10px"]::before,
  .ql-size .ql-picker-label[data-value="10px"]::before  { content: '10'; }
  .ql-size .ql-picker-item[data-value="11px"]::before,
  .ql-size .ql-picker-label[data-value="11px"]::before  { content: '11'; }
  .ql-size .ql-picker-item[data-value="12px"]::before,
  .ql-size .ql-picker-label[data-value="12px"]::before  { content: '12'; }
  .ql-size .ql-picker-item[data-value="14px"]::before,
  .ql-size .ql-picker-label[data-value="14px"]::before  { content: '14'; }
  .ql-size .ql-picker-item[data-value="16px"]::before,
  .ql-size .ql-picker-label[data-value="16px"]::before  { content: '16'; }
  .ql-size .ql-picker-item[data-value="18px"]::before,
  .ql-size .ql-picker-label[data-value="18px"]::before  { content: '18'; }
  .ql-size .ql-picker-item[data-value="20px"]::before,
  .ql-size .ql-picker-label[data-value="20px"]::before  { content: '20'; }
  .ql-size .ql-picker-item[data-value="24px"]::before,
  .ql-size .ql-picker-label[data-value="24px"]::before  { content: '24'; }
  .ql-size .ql-picker-item[data-value="28px"]::before,
  .ql-size .ql-picker-label[data-value="28px"]::before  { content: '28'; }
  .ql-size .ql-picker-item[data-value="32px"]::before,
  .ql-size .ql-picker-label[data-value="32px"]::before  { content: '32'; }
  .ql-size .ql-picker-item[data-value="36px"]::before,
  .ql-size .ql-picker-label[data-value="36px"]::before  { content: '36'; }
  .ql-size .ql-picker-item[data-value="48px"]::before,
  .ql-size .ql-picker-label[data-value="48px"]::before  { content: '48'; }
  .ql-size .ql-picker-item[data-value="72px"]::before,
  .ql-size .ql-picker-label[data-value="72px"]::before  { content: '72'; }
  .ql-size .ql-picker-item:not([data-value])::before,
  .ql-size .ql-picker-label:not([data-value])::before,
  .ql-size .ql-picker-item[data-value=""]::before,
  .ql-size .ql-picker-label[data-value=""]::before      { content: '12'; }

  /* Header picker labels */
  .ql-header .ql-picker-item[data-value="1"]::before,
  .ql-header .ql-picker-label[data-value="1"]::before { content: 'Heading 1'; }
  .ql-header .ql-picker-item[data-value="2"]::before,
  .ql-header .ql-picker-label[data-value="2"]::before { content: 'Heading 2'; }
  .ql-header .ql-picker-item[data-value="3"]::before,
  .ql-header .ql-picker-label[data-value="3"]::before { content: 'Heading 3'; }
  .ql-header .ql-picker-item[data-value="4"]::before,
  .ql-header .ql-picker-label[data-value="4"]::before { content: 'Heading 4'; }
  .ql-header .ql-picker-item[data-value="5"]::before,
  .ql-header .ql-picker-label[data-value="5"]::before { content: 'Heading 5'; }
  .ql-header .ql-picker-item[data-value="6"]::before,
  .ql-header .ql-picker-label[data-value="6"]::before { content: 'Heading 6'; }
  .ql-header .ql-picker-item:not([data-value])::before,
  .ql-header .ql-picker-label:not([data-value])::before,
  .ql-header .ql-picker-item[data-value=""]::before,
  .ql-header .ql-picker-label[data-value="false"]::before,
  .ql-header .ql-picker-label:not([data-value])::before { content: 'Normal'; }

  /* Picker widths */
  .ql-toolbar .ql-font  { width: 130px !important; }
  .ql-toolbar .ql-size  { width: 60px  !important; }
  .ql-toolbar .ql-header { width: 110px !important; }

  /* ── Dark mode ── */
  body.dark .ql-toolbar.ql-snow {
    background: #2a2a3e !important;
    border-bottom-color: #45475a !important;
    box-shadow: 0 1px 4px rgba(0,0,0,0.3) !important;
  }
  body.dark .ql-toolbar.ql-snow .ql-formats {
    border-right-color: #45475a !important;
  }
  body.dark .ql-toolbar.ql-snow button:hover { background: #3a3a5c !important; }
  body.dark .ql-toolbar.ql-snow button.ql-active { background: #1a3a6e !important; }
  body.dark .ql-toolbar.ql-snow .ql-stroke { stroke: #cdd6f4 !important; }
  body.dark .ql-toolbar.ql-snow .ql-fill   { fill:   #cdd6f4 !important; }
  body.dark .ql-toolbar.ql-snow .ql-picker  { background: #313244 !important; border-color: #45475a !important; }
  body.dark .ql-toolbar.ql-snow .ql-picker-label { color: #cdd6f4 !important; }
  body.dark .ql-toolbar.ql-snow .ql-picker-options { background: #313244 !important; border-color: #45475a !important; }
  body.dark .ql-toolbar.ql-snow .ql-picker-item { color: #cdd6f4 !important; }
  body.dark .ql-toolbar.ql-snow .ql-picker-item:hover { background: #1a3a6e !important; }
  body.dark .ql-container.ql-snow { background: #1a1a2e !important; }
  body.dark .ql-editor {
    background: #1e1e2e !important;
    color: #cdd6f4 !important;
    box-shadow: 0 1px 8px rgba(0,0,0,0.4) !important;
  }
  body.dark .ql-editor h1 { color: #89b4fa !important; }
  body.dark .ql-editor h2 { color: #74c7ec !important; }
  body.dark .ql-editor h3 { color: #cba6f7 !important; }
  body.dark .ql-editor blockquote {
    background: #1a3a6e22 !important;
    border-left-color: #89b4fa !important;
    color: #cdd6f4 !important;
  }
  body.dark .ql-editor code { background: #313244 !important; color: #f38ba8 !important; }
  body.dark .ql-editor a { color: #89b4fa !important; }

  /* ── Ruler (page width indicator) ── */
  .ql-container.ql-snow::before {
    content: '';
    display: block;
    height: 24px;
    background: #e8e8e8;
    border-bottom: 1px solid #d0d0d0;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: #f0f0f0; }
  ::-webkit-scrollbar-thumb { background: #c0c0c0; border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: #a0a0a0; }
`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
