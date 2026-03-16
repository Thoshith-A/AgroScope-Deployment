import { useTranslation } from "@/context/TranslationContext";
import LanguageSelector from "./LanguageSelector";
import { toast } from "sonner";

export default function GlobalLanguageSelector() {
  const { currentLanguage, setLanguage, t } = useTranslation();

  const handleChange = async (lang: { code: string; name: string; native: string }) => {
    await setLanguage(lang);
    toast.success(`🌐 ${lang.native} ${lang.name} ${t("lang_activated")}`);
  };

  return (
    <LanguageSelector
      selected={currentLanguage}
      onChange={handleChange}
      className="shrink-0"
      variant="navbar"
    />
  );
}
