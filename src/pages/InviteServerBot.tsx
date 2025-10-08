import PageHeader from "../components/PageHeader";
import { css, styled } from "solid-styled-components";
import PageFooter from "@/components/PageFooter";
import { For, Show, createSignal, onMount } from "solid-js";
import { StorageKeys, getStorageString } from "@/common/localStorage";
import RouterEndpoints from "@/common/RouterEndpoints";
import { useNavigate, useParams, useSearchParams } from "solid-navigator";
import {
  RawBotUser,
  getApplicationBot,
} from "@/chat-api/services/ApplicationService";
import { RawServer } from "@/chat-api/RawData";
import Avatar from "@/components/ui/Avatar";
import Text from "@/components/ui/Text";
import { FlexColumn, FlexRow } from "@/components/ui/Flexbox";
import DropDown from "@/components/ui/drop-down/DropDown";
import Button from "@/components/ui/Button";
import {
  ROLE_PERMISSIONS,
  addBit,
  hasBit,
  removeBit,
} from "@/chat-api/Bitwise";
import { t } from "i18next";
import Checkbox from "@/components/ui/Checkbox";
import { inviteBot } from "@/chat-api/services/ServerService";
import { Modal } from "@/components/ui/modal";
import { CustomPortalProvider } from "@/components/ui/custom-portal/CustomPortal";

const HomePageContainer = styled("div")`
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
`;

const Content = styled("div")`
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 8px;
  margin-top: 0;
  margin-bottom: 0;
  border-radius: 8px;
  flex: 1;
  align-items: center;
`;

export default function InviteServerBotPage() {
  const params = useParams<{ appId: string }>();
  const [searchParams] = useSearchParams<{ perms: string }>();
  const permissions = () =>
    searchParams.perms ? parseInt(searchParams.perms) : 0;
  return (
    <HomePageContainer>
      <PageHeader />
      <Content class="content">
        <div
          style={{
            display: "flex",
            "padding-top": "20px",
            "padding-bottom": "20px",
            margin: "auto",
          }}
        >
          <InviteBotPopup appId={params.appId} permissions={permissions()} />
        </div>
      </Content>
      <PageFooter />
    </HomePageContainer>
  );
}

export const InviteBotPopup = (props: {
  appId: string;
  permissions?: number;
}) => {
  const navigate = useNavigate();
  const [bot, setBot] = createSignal<RawBotUser | null>(null);
  const [servers, setServers] = createSignal<Partial<RawServer>[]>([]);
  const [permissions, setPermissions] = createSignal<number>(
    props.permissions ?? 0
  );
  const [serverId, setServerId] = createSignal<string | null>(null);
  const [requestSent, setRequestSent] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [successMessage, setSuccessMessage] = createSignal<string | null>(null);

  onMount(async () => {
    if (!getStorageString(StorageKeys.USER_TOKEN, null)) {
      navigate(RouterEndpoints.LOGIN(location.pathname + location.search), {
        replace: true,
      });
      return;
    }

    const res = await getApplicationBot(props.appId, true);
    setBot(res.bot);
    setServers(res.servers);
  });

  const addBot = async () => {
    setError(null);
    setSuccessMessage(null);
    if (!serverId()) {
      setError(t("botInvite.serverSelect"));
      return;
    }
    if (requestSent()) return;
    setRequestSent(true);
    inviteBot(serverId()!, props.appId, permissions()!)
      .then(() => setSuccessMessage("Bot added to the server."))
      .catch((err) => setError(err.message))
      .finally(() => setRequestSent(false));
  };
  return (
    <Show when={bot()}>
      <FlexColumn
        style={{
          overflow: "auto",
          margin: "auto",
        }}
        gap={12}
      >
        <FlexRow itemsCenter gap={12}>
          <FlexColumn gap={12}>
            <Avatar animate user={bot()!} size={80} />
          </FlexColumn>
          <FlexColumn gap={8}>
            <Text bold size={18}>
              {bot()?.username}
            </Text>
            <FlexRow gap={8}>
              <Text>{t("botInvite.creator")}</Text>
              <Avatar
                animate
                user={bot()!.application.creatorAccount.user}
                size={24}
              />
              <Text>{bot()!.application.creatorAccount.user.username} </Text>
            </FlexRow>
          </FlexColumn>
        </FlexRow>
        <PermissionList
          permissions={permissions()}
          setPermissions={setPermissions}
        />

        <DropDown
          onChange={(item) => setServerId(item.id)}
          title={t("botInvite.selectButton")}
          class={css`
            flex: 1;
            width: 100%;
          `}
          items={servers().map((server) => ({
            label: server.name!,
            id: server.id!,
          }))}
        />
        <Show when={error()}>
          <Text color="var(--alert-color)">{error()}</Text>
        </Show>
        <Show when={successMessage()}>
          <Text color="var(--success-color)">{successMessage()}</Text>
        </Show>
        <Button
          label={t("botInvite.addButton")}
          iconName="add"
          primary
          margin={0}
          styles={{ "align-self": "stretch" }}
          onClick={addBot}
        />
      </FlexColumn>
    </Show>
  );
};

const PermissionList = (props: {
  permissions: number;
  setPermissions: (permissions: number) => void;
}) => {
  const permissionsList = Object.values(ROLE_PERMISSIONS);

  const togglePermission = (bit: number) => {
    const hasPerm = hasBit(props.permissions, bit);
    props.setPermissions(
      hasPerm
        ? removeBit(props.permissions, bit)
        : addBit(props.permissions, bit)
    );
  };

  return (
    <FlexColumn
      gap={8}
      class={css`
        flex: 1;
        width: 100%;
      `}
    >
      <Text opacity={0.8}>{t("botInvite.permissions")}</Text>
      <FlexColumn gap={12}>
        <For each={permissionsList}>
          {(permission) => (
            <FlexRow gap={8}>
              <Checkbox
                checked={hasBit(props.permissions, permission.bit)}
                onChange={() => togglePermission(permission.bit)}
                label={t(permission.name)}
              />
            </FlexRow>
          )}
        </For>
      </FlexColumn>
    </FlexColumn>
  );
};
