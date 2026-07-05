/**
 * VideoPlayer — renders a streaming URL inside an in-app WebView.
 *
 * For embed/iframe URLs (playmogo, streampoi, etc.) the URL is loaded directly
 * as the WebView source — no double-iframe wrapping — so the player has full
 * DOM access, cookies work, and autoplay fires correctly.
 *
 * For direct media files (.m3u8, .mp4) we wrap in a minimal HTML5 <video>
 * so the native media element handles adaptive streaming.
 */
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import WebView from 'react-native-webview';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface VideoPlayerProps {
  url: string;
  title?: string;
  onError?: () => void;
}

function isDirectMedia(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return path.endsWith('.m3u8') || path.endsWith('.mp4') || path.endsWith('.webm');
  } catch {
    return false;
  }
}

/** Minimal HTML5 video player for direct .m3u8 / .mp4 URLs */
function buildVideoHtml(url: string): string {
  const escaped = url.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; background:#000; overflow:hidden; display:flex; align-items:center; justify-content:center; }
video { width:100%; height:100%; object-fit:contain; background:#000; }
</style>
</head>
<body>
<video
  src="${escaped}"
  controls
  autoplay
  playsinline
  webkit-playsinline
  x5-playsinline
></video>
</body>
</html>`;
}

export default function VideoPlayer({ url, title, onError }: VideoPlayerProps) {
  const colors = useColors();
  const webRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <View style={[styles.errorBox, { backgroundColor: '#000' }]}>
        <Feather name="alert-triangle" size={32} color={colors.primary} />
        <Text style={styles.errorText}>Gagal memuat player</Text>
        <TouchableOpacity
          onPress={() => {
            setErrored(false);
            setLoading(true);
            webRef.current?.reload();
          }}
          style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.retryText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const direct = isDirectMedia(url);

  const webViewSource = direct
    ? { html: buildVideoHtml(url), baseUrl: '' }
    : { uri: url };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} size="large" />
          {!!title && (
            <Text style={styles.loadingTitle} numberOfLines={1}>
              {title}
            </Text>
          )}
        </View>
      )}
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={webViewSource}
        style={styles.webview}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        startInLoadingState={false}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setErrored(true);
          onError?.();
        }}
        onHttpError={(e) => {
          // Ignore minor HTTP errors (e.g. 204, redirects) — only fail on hard errors
          if (e.nativeEvent.statusCode >= 500) {
            setLoading(false);
            setErrored(true);
            onError?.();
          }
        }}
        // Allow all top-level navigation — embed players often redirect for
        // fullscreen, login prompts, and CDN hops that are required to play video.
        onShouldStartLoadWithRequest={() => true}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        // Android: allow mixed content so http embeds load inside https WebView
        mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1, backgroundColor: '#000' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { color: '#aaa', fontSize: 14, fontFamily: 'Inter_400Regular' },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
