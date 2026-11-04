import React from 'react';
import { FileText, Download, ExternalLink } from 'lucide-react';

export const FileAttachmentPreview = ({ attachments = [] }) => {
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2.5 mt-2">
      {attachments.map((file, idx) => {
        const isImage = file.mimeType?.startsWith('image/');
        const downloadUrl = file.url || `/api/v1/files/${file.fileAssetId}/download`;

        if (isImage) {
          return (
            <div
              key={idx}
              className="relative group rounded-xl overflow-hidden border border-[#35383F] max-w-sm bg-[#16181C]"
            >
              <img
                src={downloadUrl}
                alt={file.originalName}
                className="max-h-60 rounded-xl object-cover hover:opacity-95 transition-opacity"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end p-2 gap-2">
                <a
                  href={downloadUrl}
                  download={file.originalName}
                  className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/90 transition-colors"
                  title="Download Image"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        }

        const sizeKb = Math.round((file.size || 0) / 1024);

        return (
          <div
            key={idx}
            className="flex items-center gap-3 p-2.5 rounded-xl border border-[#35383F] bg-[#222529] hover:bg-[#282B30] transition-colors max-w-xs"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col truncate flex-1">
              <span className="text-xs font-medium text-slate-200 truncate">
                {file.originalName}
              </span>
              <span className="text-[10px] text-[#8C9098]">
                {sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`}
              </span>
            </div>
            <a
              href={downloadUrl}
              download={file.originalName}
              className="p-1.5 text-[#8C9098] hover:text-white rounded-lg hover:bg-[#34383F] transition-colors"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        );
      })}
    </div>
  );
};
