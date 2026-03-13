import { LinkingOptions } from "@react-navigation/native";
import { RootStackParamList } from "./RootNavigator";

const prefixes = [
  "statxt://",
  "https://app.statxt.com",
];

/**
 * Deep link routes: login, signup, forgot-password, messages, messages/:conversationId, contacts, contacts/:contactId.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes,
  config: {
    screens: {
      Auth: {
        path: "",
        screens: {
          Login: "login",
          Signup: "signup",
          ForgotPassword: "forgot-password",
        },
      },
      Main: {
        path: "",
        screens: {
          TeamTab: {
            path: "team",
            screens: {
              TeamMain: "",
              InternalChat: "chat",
              TeamChatThread: "thread/:threadId",
            },
          },
          ContactsTab: {
            path: "contacts",
            screens: {
              ContactsList: "",
              ContactDetail: ":contactId",
            },
          },
          MessagesTab: {
            path: "messages",
            screens: {
              Conversations: "",
              Chat: ":conversationId",
            },
          },
          CampaignsTab: {
            path: "campaigns",
            screens: {
              CampaignsList: "",
              CampaignDetail: ":campaignId",
              CampaignCreate: "create",
              AutoBlasts: "autoblasts",
            },
          },
          SettingsTab: {
            path: "settings",
            screens: {
              SettingsMain: "",
              HelpCenter: "help",
            },
          },
        },
      },
      Call: "call",
    },
  },
};
