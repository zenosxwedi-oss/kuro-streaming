/**
 * VideoPlayer — renders a streaming URL inside an in-app WebView.
 *
 * For embed/iframe URLs (playmogo, streampoi, etc.) the URL is loaded directly
 * as the WebView source with a proper Chrome User-Agent so embed players don't
 * block the request.
 *
 * For direct media files (.m3u8, .mp4) we wrap in a minimal HTML5 page that
 * uses HLS.js for adaptive streaming support on Android.
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

// Chrome Android UA — many embed players (playmogo, streampoi) block non-browser UAs
const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36';

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

/** HTML5 video player with HLS.js for .m3u8 and native fallback for .mp4/.webm */
function buildVideoHtml(url: string): string {
  const escaped = url.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
<video id="video" controls autoplay playsinline webkit-playsinline x5-playsinline></video>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js"></script>
<script>
(function() {
  var video = document.getElementById('video');
  var src = "${escaped}";
  var isHls = src.indexOf('.m3u8') !== -1;
  if (isHls && typeof Hls !== 'undefined' && Hls.isSupported()) {
    var hls = new Hls({ enableWorker: false });
    hls.loadSource(src);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, function() { video.play().catch(function(){}); });
    hls.on(Hls.Events.ERROR, function(e, data) {
      if (data.fatal) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage('hls_error:' + data.type);
      }
    });
  } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari / iOS native HLS
    video.src = src;
    video.addEventListener('loadedmetadata', function() { video.play().catch(function(){}); });
  } else {
    video.src = src;
    video.play().catch(function(){});
  }
})();
</script>
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
    ? { html: buildVideoHtml(url), baseUrl: 'https://nekopoi.care' }
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
        // Use Chrome UA so embed players (playmogo, streampoi, etc.) don't block
        userAgent={CHROME_UA}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        startInLoadingState={false}
        onLoadStart={() => { setLoading(true); setErrored(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setErrored(true);
          onError?.();
        }}
        onHttpError={(e) => {
          // Only fail on hard server errors; ignore redirects, 204, etc.
          if (e.nativeEvent.statusCode >= 500) {
            setLoading(false);
            setErrored(true);
            onError?.();
          }
        }}
        onMessage={(e) => {
          // HLS.js error from inside the HTML page
          if (e.nativeEvent.data?.startsWith('hls_error:')) {
            setLoading(false);
            setErrored(true);
            onError?.();
          }
        }}
        onShouldStartLoadWithRequest={() => true}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setSupportMultipleWindows={false}
        // Allow mixed content so http embeds load inside https WebView on Android
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
