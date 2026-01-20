import React, { forwardRef, useImperativeHandle, useState, useRef, useMemo } from 'react';
import { Modal, StyleSheet, ActivityIndicator, View, TouchableOpacity, Text, SafeAreaView, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

interface FirebaseRecaptchaProps {
  firebaseConfig: any;
  onVerify?: (token: string) => void;
  onCancel?: () => void;
  title?: string;
  cancelLabel?: string;
}

export interface FirebaseAuthApplicationVerifier {
  verify(): Promise<string>;
}

const FirebaseRecaptcha = forwardRef<FirebaseAuthApplicationVerifier, FirebaseRecaptchaProps>(({ 
  firebaseConfig, 
  title = "Verify you are human",
  cancelLabel = "Cancel"
}, ref) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const webViewRef = useRef<WebView>(null);
  const resolver = useRef<((token: string) => void) | null>(null);
  const rejecter = useRef<((error: Error) => void) | null>(null);

  useImperativeHandle(ref, () => ({
    verify: () => {
      return new Promise<string>((resolve, reject) => {
        resolver.current = resolve;
        rejecter.current = reject;
        setVisible(true);
        setLoading(true);
      });
    }
  }));

  const handleCancel = () => {
    setVisible(false);
    if (rejecter.current) {
        rejecter.current(new Error('User cancelled the verification'));
    }
  };

  const html = useMemo(() => {
    // We use a specific version of firebase to ensure compatibility
    // and initialize the verifier properly.
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: white; }
    #recaptcha-container { transform: scale(1.0); transform-origin: 0 0; }
  </style>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
  <script>
    const config = ${JSON.stringify(firebaseConfig)};
    firebase.initializeApp(config);
    
    function onLoad() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'load' }));
      try {
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
          'size': 'normal',
          'callback': function(response) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'verify', token: response }));
          },
          'expired-callback': function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expire' }));
          },
          'error-callback': function(error) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: error.message || 'Unknown error' }));
          }
        });
        window.recaptchaVerifier.render();
      } catch (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: e.toString() }));
      }
    }
  </script>
</head>
<body onload="onLoad()">
  <div id="recaptcha-container"></div>
</body>
</html>
    `;
  }, [firebaseConfig]);

  const onMessage = (event: any) => {
    try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'load') {
            setLoading(false);
        } else if (data.type === 'verify') {
            if (resolver.current) resolver.current(data.token);
            setVisible(false);
        } else if (data.type === 'error') {
            if (rejecter.current) rejecter.current(new Error(data.error));
            setVisible(false);
        } else if (data.type === 'expire') {
            // handle expiration
        }
    } catch (e) {
        console.warn("Recaptcha message error", e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleCancel}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.cancel}>{cancelLabel}</Text>
            </TouchableOpacity>
        </View>
        <View style={styles.webviewContainer}>
            <WebView
                ref={webViewRef}
                source={{ html, baseUrl: firebaseConfig.authDomain ? `https://${firebaseConfig.authDomain}` : undefined }}
                onMessage={onMessage}
                javaScriptEnabled
                scalesPageToFit
                mixedContentMode="always"
                style={{ flex: 1 }}
            />
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </View>
            )}
        </View>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'white' },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
    title: { fontWeight: 'bold', fontSize: 16 },
    cancel: { color: 'blue', fontSize: 16 },
    webviewContainer: { flex: 1, position: 'relative' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)' }
});

export default FirebaseRecaptcha;
