// Mock expo-secure-store
jest.mock("expo-secure-store", () => {
  const store = {};
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    __store: store,
    __clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
});

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
  Link: "Link",
}));

// Mock react-native
jest.mock("react-native", () => {
  const React = require("react");
  const RN = {
    Platform: { OS: "ios", select: (obj) => obj.ios },
    NativeModules: {},
    TurboModuleRegistry: {
      get: jest.fn(() => null),
      getEnforcing: jest.fn(() => null),
    },
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => {
        if (Array.isArray(style)) {
          return Object.assign({}, ...style.filter(Boolean));
        }
        return style || {};
      },
    },
    Alert: {
      alert: jest.fn(),
    },
    View: "View",
    Text: "Text",
    TextInput: React.forwardRef(({ onChangeText, onSubmitEditing, ...props }, ref) => {
      return React.createElement("TextInput", {
        ...props,
        ref,
        onChangeText,
        onSubmitEditing,
      });
    }),
    TouchableOpacity: ({ onPress, children, ...props }) => {
      return React.createElement("TouchableOpacity", { ...props, onPress }, children);
    },
    FlatList: ({ data, renderItem, keyExtractor, ListEmptyComponent, ...props }) => {
      if (!data || data.length === 0) {
        return React.createElement("View", props, ListEmptyComponent);
      }
      return React.createElement(
        "View",
        props,
        data.map((item, index) =>
          React.createElement(
            React.Fragment,
            { key: keyExtractor ? keyExtractor(item, index) : index },
            renderItem({ item, index, separators: {} }),
          ),
        ),
      );
    },
    ScrollView: ({ children, ...props }) => {
      return React.createElement("ScrollView", props, children);
    },
    KeyboardAvoidingView: ({ children, ...props }) => {
      return React.createElement("KeyboardAvoidingView", props, children);
    },
    ActivityIndicator: (props) => React.createElement("ActivityIndicator", props),
    Image: (props) => React.createElement("Image", props),
    Pressable: ({ onPress, children, style, ...props }) => {
      return React.createElement(
        "Pressable",
        {
          ...props,
          onPress,
          style: typeof style === "function" ? style({ pressed: false }) : style,
        },
        children,
      );
    },
  };
  return RN;
});

// Mock expo-status-bar
jest.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar",
}));
