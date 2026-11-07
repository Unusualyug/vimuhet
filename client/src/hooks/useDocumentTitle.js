import { useEffect } from 'react';

const SITE = 'Vimuhet';

export function useDocumentTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE}` : `${SITE} — Premium Ethnic Wear for Women`;
    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}

export default useDocumentTitle;
