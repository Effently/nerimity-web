import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import Text from "@/components/ui/Text";
import { css, styled } from "solid-styled-components";
import {
  getCurrentLanguage,
  getLanguage,
  Language,
  languages,
  setCurrentLanguage,
} from "@/locales/languages";

import ItemContainer from "../ui/LegacyItem";
import { FlexColumn, FlexRow } from "../ui/Flexbox";
import useStore from "@/chat-api/store/useStore";
import { useTransContext } from "@nerimity/solid-i18lite";
import { emojiUnicodeToShortcode, unicodeToTwemojiUrl } from "@/emoji";
import { Emoji } from "../markup/Emoji";
import { CustomLink } from "../ui/CustomLink";
import Breadcrumb, { BreadcrumbItem } from "../ui/Breadcrumb";
import { t } from "@nerimity/i18lite";
import { Notice } from "../ui/Notice/Notice";
import Button from "../ui/Button";
import en from "@/locales/list/en-gb.json?raw";
import { Modal } from "../ui/modal";
import { useCustomPortal } from "../ui/custom-portal/CustomPortal";
import { Rerun } from "@solid-primitives/keyed";

const Container = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
`;

const LanguageItemContainer = styled(ItemContainer)`
  padding: 5px;
  gap: 10px;
  padding-left: 10px;
  &:hover {
    box-shadow: 0 0 2px 0 rgba(0, 0, 0, 0.4);
  }
`;

export default function LanguageSettings() {
  const { header } = useStore();
  const [, actions] = useTransContext();
  const [languageUpdated, setLanguageUpdated] = createSignal(false);

  const [currentLocalLanguage, setCurrentLocalLanguage] = createSignal(
    getCurrentLanguage() || "en_gb"
  );

  const [percentTranslated, setPercentTranslated] = createSignal(0);

  const checkTranslatedStrings = (langKey: string, lang: any) => {
    let total = 0;
    let translated = 0;
    const checkNested = (obj: any, nestedLang: any) => {
      for (const key in obj) {
        if (typeof obj[key] === "string") {
          total++;
          if (nestedLang?.[key] && nestedLang?.[key] !== obj) translated++;
        } else if (typeof obj[key] === "object") {
          checkNested(obj[key], nestedLang?.[key]);
        }
      }
    };

    checkNested(en, lang);
    const percent = (translated / total) * 100;
    setPercentTranslated(percent);
  };

  onMount(async () => {
    const currentKey = getCurrentLanguage() || "en_gb";
    const language = await getLanguage(currentKey);
    checkTranslatedStrings(currentKey.replace("_", "-"), language);
  });

  createEffect(() => {
    header.updateHeader({
      title: "Settings - Language",
      iconName: "settings",
    });
  });

  const languageKeys = Object.keys(languages);

  const setLanguage = async (key: string) => {
    const oldKey = key;
    key = key.replace("-", "_");
    if (getCurrentLanguage() !== key) {
      setLanguageUpdated(true);
    }
    
    // Set language attribute without changing layout direction
    document.documentElement.setAttribute("lang", oldKey || "en");
    
    if (key !== "en_gb") {
      const language = await getLanguage(key);
      if (!language) return;
      checkTranslatedStrings(oldKey, language);
      actions.addResources(key, "translation", language);
    } else {
      setPercentTranslated(100);
    }
    actions.changeLanguage(key);
    setCurrentLanguage(key);
    setCurrentLocalLanguage(key);
  };

  return (
    <Rerun on={getCurrentLanguage}>
      <Container>
        <Breadcrumb>
          <BreadcrumbItem
            href="/app"
            icon="home"
            title={t("dashboard.title")}
          />
          <BreadcrumbItem title={t("settings.drawer.language")} />
        </Breadcrumb>
        {/* <Show when={languageUpdated()}>
          <Notice
            type="warn"
            description="You must reload the app to fully apply the new language."
          >
            <div style={{ display: "flex", "justify-content": "flex-end" }}>
              <Button
                onClick={() => window.location.reload()}
                label="Reload"
                iconName="refresh"
                primary
                margin={0}
                padding={4}
                iconSize={18}
              />
            </div>
          </Notice>
        </Show> */}
        <For each={languageKeys}>
          {(key) => (
            <LanguageItem
              selected={currentLocalLanguage().replace("_", "-") === key}
              onClick={() => setLanguage(key)}
              key={key}
              percentTranslated={percentTranslated()}
            />
          )}
        </For>
      </Container>
    </Rerun>
  );
}

function LanguageItem(props: {
  key: string;
  selected: boolean;
  onClick: () => void;
  percentTranslated?: number;
}) {
  const { createPortal } = useCustomPortal();
  const language = (languages as any)[props.key] as Language;

  const onClick = (event: any) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "A") return;
    props.onClick();
  };

  const handlePercentClick = async () => {
    const key = props.key.replace("_", "-");
    const language = await getLanguage(key);

    createPortal((close) => (
      <TranslateModal close={close} language={language} />
    ));
  };

  return (
    <LanguageItemContainer onclick={onClick} selected={props.selected}>
      <Emoji
        class={css`
          height: 30px;
          width: 30px;
        `}
        name={emojiUnicodeToShortcode(language.emoji)}
        url={unicodeToTwemojiUrl(language.emoji)}
      />
      <FlexColumn>
        <Text>{language.name}</Text>
        <Contributors contributors={language.contributors} />
      </FlexColumn>
      <Show when={props.percentTranslated && props.selected}>
        <div
          class={css`
            margin-left: auto;
            opacity: 0.4;
            cursor: pointer;
            transition: 0.2s;
            &:hover {
              opacity: 1;
            }
          `}
          onClick={handlePercentClick}
        >
          {Math.floor(props.percentTranslated || 0)}%
        </div>
      </Show>
    </LanguageItemContainer>
  );
}

const ContributorContainer = styled(FlexRow)`
  font-size: 14px;
`;

function Contributors(props: { contributors: string[] }) {
  return (
    <FlexRow>
      <Text size={14} style={{ "margin-right": "5px" }}>
        Contributors:
      </Text>
      <For each={props.contributors}>
        {(contributor, i) => (
          <ContributorContainer gap={5}>
            <Show when={i() > 0}>{", "}</Show>
            <Show when={isUrl(contributor)}>
              <CustomLink
                decoration
                href={contributor}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lastPath(contributor)}
              </CustomLink>
            </Show>
            <Show when={!isUrl(contributor)}>
              <Text size={14} opacity={0.8}>
                {contributor}
              </Text>
            </Show>
          </ContributorContainer>
        )}
      </For>
    </FlexRow>
  );
}

function isUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

function lastPath(url: string) {
  const split = url.split("/");
  return split[split.length - 1];
}

const TranslateModal = (props: { language: any; close: () => void }) => {
  let iframe: HTMLIFrameElement | undefined;

  const handleIframeLoad = () => {
    iframe?.contentWindow?.postMessage(
      { default: en, translated: { ...props.language } },
      "https://supertigerdev.github.io/i18n-tool/"
    );
  };

  return (
    <Modal.Root
      close={props.close}
      doNotCloseOnBackgroundClick
      desktopMaxWidth={860}
      class={css`
        width: 90vw;
      `}
    >
      <Modal.Header title="Translate" icon="translate" />
      <Modal.Body
        class={css`
          height: 90vh;
        `}
      >
        <iframe
          src="https://supertigerdev.github.io/i18n-tool/"
          height="100%"
          width="100%"
          ref={iframe}
          onLoad={() => handleIframeLoad()}
          frameborder="0"
          id="iframe"
        />
      </Modal.Body>
    </Modal.Root>
  );
};
