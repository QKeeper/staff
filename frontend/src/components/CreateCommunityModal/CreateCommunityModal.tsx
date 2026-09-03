import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Hint } from "@/components/ui/Hint";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Modal } from "@/components/ui/Modal";
import { Select, type SelectItem } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { z } from "zod";

const TOPIC_KEYS = [
  "animeCosplay",
  "art",
  "technology",
  "businessFinance",
  "collectiblesHobbies",
  "educationCareer",
  "fashionBeauty",
  "foodDrinks",
  "games",
  "health",
  "homeGarden",
  "humanitiesLaw",
  "identityRelationships",
  "internetCulture",
  "moviesTv",
  "music",
  "natureOutdoors",
  "newsPolitics",
  "placesTravel",
  "popCulture",
  "qasStories",
  "readingWriting",
  "sciences",
  "spooky",
  "sports",
  "vehicles",
  "wellness",
  "adultContent",
  "matureTopics",
] as const;

const createCommunitySchema = z.object({
  name: z
    .string()
    .min(2)
    .max(32)
    .regex(/^[a-zA-Z]+$/),
  description: z.string().min(1).max(1024),
  topic: z.string(),
  rulesAgreement: z.literal(true),
});

type CreateCommunityFormValues = z.infer<typeof createCommunitySchema>;

const createCommunityMockApi = async (data: CreateCommunityFormValues) => {
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // 40% chance of failing to simulate network/server error
  if (Math.random() < 0.4) {
    throw new Error("Mock server error");
  }

  return { id: `comm_${Date.now()}`, ...data };
};

const CreateCommunityModal = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, control, reset, watch } =
    useForm<CreateCommunityFormValues>({
      resolver: zodResolver(createCommunitySchema),
      defaultValues: {
        name: "",
        description: "",
        topic: "technology",
        rulesAgreement: false as unknown as true,
      },
      mode: "onChange",
    });

  const name = watch("name");
  const description = watch("description");
  const rulesAgreement = watch("rulesAgreement");

  const errorMessages: string[] = [];
  if (
    !name ||
    name.trim().length < 2 ||
    name.trim().length > 32 ||
    !/^[a-zA-Z]+$/.test(name)
  ) {
    errorMessages.push(t("createCommunity.errors.name"));
  }
  if (
    !description ||
    description.trim().length === 0 ||
    description.length > 1024
  ) {
    errorMessages.push(t("createCommunity.errors.description"));
  }
  if (!rulesAgreement) {
    errorMessages.push(t("createCommunity.errors.rules"));
  }

  const isFormValid = errorMessages.length === 0;

  const topicItems: SelectItem[] = TOPIC_KEYS.map((key) => ({
    value: key,
    label: t(`createCommunity.topics.${key}`),
  }));

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setServerError(null);
      reset({
        name: "",
        description: "",
        topic: "technology",
        rulesAgreement: false as unknown as true,
      });
    }
  };

  const onSubmit = async (data: CreateCommunityFormValues) => {
    setIsLoading(true);
    setServerError(null);
    try {
      await createCommunityMockApi(data);
      setIsOpen(false);
      reset({
        name: "",
        description: "",
        topic: "technology",
        rulesAgreement: false as unknown as true,
      });
    } catch {
      setServerError(t("createCommunity.errors.serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={handleOpenChange} width={500}>
      <Modal.Trigger className="inline-block w-full rounded-sm px-2 py-1 text-left whitespace-nowrap text-gray-400 hover:bg-gray-900">
        {t("sidebar.createCommunity")}
      </Modal.Trigger>
      <Modal.Content>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Modal.Header>{t("createCommunity.title")}</Modal.Header>
          <Modal.Body>
            <div className="flex flex-col gap-4">
              {serverError && (
                <div className="rounded-sm border border-red-800/80 bg-red-950/50 px-3 py-2 text-xs text-red-300">
                  {serverError}
                </div>
              )}
              <div>
                <Label>{t("createCommunity.nameLabel")}</Label>
                <Input
                  autoFocus
                  disabled={isLoading}
                  placeholder={t("createCommunity.namePlaceholder")}
                  {...register("name")}
                />
              </div>
              <div>
                <Label>{t("createCommunity.descriptionLabel")}</Label>
                <Textarea
                  rows={3}
                  disabled={isLoading}
                  placeholder={t("createCommunity.descriptionPlaceholder")}
                  {...register("description")}
                />
              </div>
              <div>
                <Label>{t("createCommunity.topicLabel")}</Label>
                <Controller
                  name="topic"
                  control={control}
                  render={({ field }) => (
                    <Select
                      width="100%"
                      items={topicItems}
                      value={field.value}
                      onValueChange={(item) => field.onChange(item.value)}
                    />
                  )}
                />
              </div>
              <div className="pt-1">
                <Checkbox disabled={isLoading} {...register("rulesAgreement")}>
                  {t("createCommunity.rulesAgreement")}{" "}
                  <Link
                    to="/rules"
                    onClick={(e) => e.stopPropagation()}
                    className="text-gray-200 underline hover:text-gray-50"
                  >
                    {t("createCommunity.rulesLink")}
                  </Link>
                </Checkbox>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-2">
              <Modal.Close disabled={isLoading}>
                {t("createCommunity.cancel")}
              </Modal.Close>
              <Hint
                disabled={isFormValid || isLoading}
                content={
                  <div className="flex flex-col gap-1">
                    {errorMessages.map((error, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-1.5 text-xs text-gray-300"
                      >
                        <span className="text-red-400">•</span>
                        <span>{error}</span>
                      </div>
                    ))}
                  </div>
                }
              >
                <Button
                  type="submit"
                  variant="outline"
                  loading={isLoading}
                  disabled={!isFormValid || isLoading}
                  className="min-w-24 hover:border-gray-500 hover:bg-gray-800 active:bg-gray-700"
                >
                  {t("createCommunity.submit")}
                </Button>
              </Hint>
            </div>
          </Modal.Footer>
        </form>
      </Modal.Content>
    </Modal>
  );
};

export { CreateCommunityModal };
