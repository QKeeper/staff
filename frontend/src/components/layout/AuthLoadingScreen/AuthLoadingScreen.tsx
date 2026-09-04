import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  isLoading: boolean;
}

export const AuthLoadingScreen = ({ isLoading }: Props) => {
  const { t } = useTranslation();
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (!isLoading) return;

    // Показываем лоадер только если авторизация длится более 1 секунды
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="auth-loading-overlay"
          initial={{ opacity: 1 }}
          exit={showSpinner ? { opacity: 0 } : undefined}
          transition={
            showSpinner ? { duration: 0.4, ease: "easeInOut" } : { duration: 0 }
          }
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-950"
          role="status"
          aria-live="polite"
        >
          {showSpinner && (
            <motion.div
              key="auth-spinner"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute size-12 animate-ping rounded-full bg-blue-500/10" />
                <Loader2
                  className="size-8 animate-spin text-blue-500"
                  aria-label={t("common.loading")}
                />
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
