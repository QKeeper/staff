import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/api/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "register";
}

interface AuthFormValues {
  username?: string;
  email?: string;
  login?: string;
  password?: string;
}

export const AuthModal = ({
  open,
  onOpenChange,
  defaultTab = "login",
}: AuthModalProps) => {
  const { t } = useTranslation();
  const { login, register: registerUser } = useAuth();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<AuthFormValues>();

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      setServerError(null);
      reset();
    }
  };

  const onSubmit = async (data: AuthFormValues) => {
    setIsLoading(true);
    setServerError(null);

    try {
      if (tab === "login") {
        await login({
          login: data.login || "",
          password: data.password || "",
        });
      } else {
        await registerUser({
          username: data.username || "",
          email: data.email || "",
          password: data.password || "",
        });
      }
      onOpenChange(false);
      reset();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError(t("auth.defaultError"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={handleOpenChange} width={420}>
      <Modal.Content>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header>
            <div className="flex gap-4 border-b border-gray-800 pb-2">
              <button
                type="button"
                className={`pb-1 text-sm font-medium transition-colors ${
                  tab === "login"
                    ? "border-b-2 border-white text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                onClick={() => {
                  setTab("login");
                  setServerError(null);
                }}
              >
                {t("auth.loginTab")}
              </button>
              <button
                type="button"
                className={`pb-1 text-sm font-medium transition-colors ${
                  tab === "register"
                    ? "border-b-2 border-white text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
                onClick={() => {
                  setTab("register");
                  setServerError(null);
                }}
              >
                {t("auth.registerTab")}
              </button>
            </div>
          </Modal.Header>

          <Modal.Body>
            <div className="flex flex-col gap-4 pt-2">
              {serverError && (
                <div className="rounded-sm border border-red-800/80 bg-red-950/50 px-3 py-2 text-xs text-red-300">
                  {serverError}
                </div>
              )}

              {tab === "register" && (
                <div>
                  <Label>{t("auth.usernameLabel")}</Label>
                  <Input
                    required
                    minLength={3}
                    maxLength={30}
                    disabled={isLoading}
                    placeholder={t("auth.usernamePlaceholder")}
                    {...register("username")}
                  />
                </div>
              )}

              {tab === "register" ? (
                <div>
                  <Label>{t("auth.emailLabel")}</Label>
                  <Input
                    type="email"
                    required
                    disabled={isLoading}
                    placeholder={t("auth.emailPlaceholder")}
                    {...register("email")}
                  />
                </div>
              ) : (
                <div>
                  <Label>{t("auth.loginLabel")}</Label>
                  <Input
                    required
                    disabled={isLoading}
                    placeholder={t("auth.loginPlaceholder")}
                    {...register("login")}
                  />
                </div>
              )}

              <div>
                <Label>{t("auth.passwordLabel")}</Label>
                <Input
                  type="password"
                  required
                  minLength={6}
                  disabled={isLoading}
                  placeholder={t("auth.passwordPlaceholder")}
                  {...register("password")}
                />
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <div className="flex w-full flex-col gap-2">
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading
                  ? "..."
                  : tab === "login"
                    ? t("auth.submitLogin")
                    : t("auth.submitRegister")}
              </Button>
              <button
                type="button"
                className="text-center text-xs text-gray-400 hover:underline"
                onClick={() => {
                  setTab(tab === "login" ? "register" : "login");
                  setServerError(null);
                }}
              >
                {tab === "login"
                  ? t("auth.switchToRegister")
                  : t("auth.switchToLogin")}
              </button>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal>
  );
};
