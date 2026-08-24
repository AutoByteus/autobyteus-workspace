import type { ContextAttachmentType } from '~/types/conversation';

export const getContextAttachmentIcon = (type: ContextAttachmentType): string => {
  switch (type) {
    case 'Image':
      return 'fa-image';
    case 'Audio':
      return 'fa-file-audio';
    case 'Video':
      return 'fa-file-video';
    case 'Pdf':
      return 'fa-file-pdf';
    case 'Markdown':
    case 'Text':
      return 'fa-file-lines';
    case 'Csv':
    case 'Xlsx':
      return 'fa-file-excel';
    case 'Docx':
      return 'fa-file-word';
    case 'Pptx':
      return 'fa-file-powerpoint';
    case 'Json':
    case 'Javascript':
    case 'Python':
    case 'Xml':
    case 'Html':
      return 'fa-file-code';
    default:
      return 'fa-file';
  }
};
