const toSafe = (value) => String(value ?? "");

export const REPORT_PDF_HEADER_STYLES = `
  .header-container {
    border: 2px solid #d7d7d7;
    border-radius: 8px;
    background: #fff;
    margin-bottom: 12px;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .header-main-table {
    width: 100%;
    border-collapse: collapse;
  }
  .logo-section {
    width: 130px;
    height: 60px;
    text-align: center;
    vertical-align: middle;
    padding: 8px;
  }
  .greenfields-logo {
    text-align: center;
  }
  .logo-green {
    font-weight: bold;
    font-size: 18px;
    color: #2e7d32;
    font-style: italic;
    font-family: "Times New Roman", serif;
  }
  .company-section {
    text-align: center;
    vertical-align: middle;
    padding: 8px;
  }
  .company-name {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    text-align: center;
  }
  .meta-section {
    width: 140px;
    vertical-align: top;
    padding: 8px;
    border-left: 1px solid #e5e5e5;
  }
  .meta-info-table {
    width: 100%;
    border-collapse: collapse;
  }
  .meta-info-table td {
    padding: 2px 0;
    font-size: 11px;
    vertical-align: top;
  }
  .meta-label {
    width: 50px;
    color: #333;
    font-weight: 600;
  }
  .meta-colon {
    width: 8px;
    text-align: center;
    color: #333;
  }
  .meta-value {
    font-weight: 600;
    color: #333;
  }
  .header-title-table {
    width: 100%;
    border-collapse: collapse;
    border-top: 1px solid #e5e5e5;
  }
  .title-label {
    width: 110px;
    padding: 6px;
    text-align: center;
    font-weight: 600;
    font-size: 11px;
    color: #333;
    background: #fafafa;
    border-right: 1px solid #e5e5e5;
  }
  .title-content {
    padding: 6px;
    text-align: center;
    font-weight: bold;
    font-size: 12px;
    color: #333;
  }
`;

export const renderReportPdfHeader = ({ title, headerMeta = {}, escapeHtml }) => {
  const esc = typeof escapeHtml === "function" ? escapeHtml : toSafe;
  const meta = {
    frm: headerMeta?.frm ?? "-",
    rev: headerMeta?.rev ?? "-",
    berlaku: headerMeta?.berlaku ?? "-",
    hal: headerMeta?.hal ?? "-",
  };

  return `
    <div class="header-container">
      <table class="header-main-table">
        <tr>
          <td class="logo-section">
            <div class="greenfields-logo">
              <span class="logo-green">Greenfields</span>
            </div>
          </td>
          <td class="company-section">
            <div class="company-name">PT. GREENFIELDS INDONESIA</div>
          </td>
          <td class="meta-section">
            <table class="meta-info-table">
              <tr><td class="meta-label">FRM</td><td class="meta-colon">:</td><td class="meta-value">${esc(meta.frm)}</td></tr>
              <tr><td class="meta-label">Rev</td><td class="meta-colon">:</td><td class="meta-value">${esc(meta.rev || "-")}</td></tr>
              <tr><td class="meta-label">Berlaku</td><td class="meta-colon">:</td><td class="meta-value">${esc(meta.berlaku)}</td></tr>
              <tr><td class="meta-label">Hal</td><td class="meta-colon">:</td><td class="meta-value">${esc(meta.hal)}</td></tr>
            </table>
          </td>
        </tr>
      </table>
      <table class="header-title-table">
        <tr>
          <td class="title-label">JUDUL</td>
          <td class="title-content">${esc(title || "-")}</td>
        </tr>
      </table>
    </div>
  `;
};
