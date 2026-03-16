import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "@/context/TranslationContext";

/** Re-triggers Google Translate when user navigates so new page content is translated. */
export default function TranslateOnNavigate() {
  const { reapplyTranslation } = useTranslation();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      reapplyTranslation();
    }
  }, [location.pathname, reapplyTranslation]);

  return null;
}
