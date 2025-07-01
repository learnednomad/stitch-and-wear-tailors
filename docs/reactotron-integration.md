# Reactotron Integration Guide

## Overview

Reactotron is now fully integrated with the Stitch and Wear Tailors application, providing comprehensive debugging and development tools. This integration includes enhanced API monitoring capabilities that work seamlessly with the services layer implemented in Issue #46.

## Features

### 🔍 **Enhanced API Monitoring**
- Real-time API request/response tracking
- Performance metrics and analytics
- Cache hit/miss monitoring
- Request deduplication tracking
- Error tracking and debugging
- Response time analysis

### 🏪 **MST Store Integration**
- Live MobX State Tree inspection
- Store action tracking
- State modification debugging
- Store reset capabilities

### 💾 **MMKV Storage Integration**
- Storage inspection and modification
- Cache management
- Data persistence debugging

### 🧭 **Navigation Debugging**
- Navigation state inspection
- Screen navigation testing
- Route parameter debugging
- Navigation reset functionality

## Getting Started

### Prerequisites

1. **Install Reactotron Desktop App**
   ```bash
   # Download from: https://github.com/infinitered/reactotron/releases
   # Or install via Homebrew (macOS):
   brew install --cask reactotron
   ```

2. **Development Dependencies** (Already installed)
   - `reactotron-react-native`
   - `reactotron-mst`
   - `reactotron-react-native-mmkv`
   - `reactotron-core-client`

### Setup for Development

1. **Start Reactotron Desktop App**
   - Open Reactotron application
   - Ensure it's listening on port 9090 (default)

2. **Start Development Server**
   ```bash
   npm start
   # or
   yarn start
   ```

3. **Run on Device/Simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   ```

### Device Configuration

#### iOS Device Setup
1. Ensure your device and computer are on the same network
2. Update `ReactotronDevConfig.ts`:
   ```typescript
   device: {
     host: "YOUR_COMPUTER_IP", // e.g., "192.168.1.100"
     port: 9090,
   }
   ```

#### Android Device Setup
1. Enable USB debugging
2. Run ADB port forwarding:
   ```bash
   adb reverse tcp:9090 tcp:9090
   ```
3. Or update the configuration with your computer's IP address

## Custom Commands

The integration provides several custom commands accessible through Reactotron:

### 🌐 **API Commands**

#### Show API Statistics
```
Command: showApiStats
```
Displays comprehensive API performance metrics including:
- Response times (average, p50, p95, p99)
- Success/error rates
- Cache hit rates
- Deduplication effectiveness

#### Show API Request History
```
Command: showApiHistory
```
Shows recent API requests with:
- Request/response details
- Failed requests
- Slow requests (>2s)
- Success/failure status

#### Clear API Monitoring Data
```
Command: clearApiData
```
Clears all API analytics, cache stats, and request history.

#### Test API Endpoint
```
Command: testEndpoint
Arguments: endpoint (string)
```
Test any API endpoint directly from Reactotron.

### 🧭 **Navigation Commands**

#### Navigate To Screen
```
Command: navigateTo
Arguments: route (string)
```
Navigate to any screen by name.

#### Reset Navigation
```
Command: resetNavigation
```
Reset navigation state to initial state.

#### Go Back
```
Command: goBack
```
Navigate back one screen.

### 🏪 **Store Commands**

#### Reset Root Store
```
Command: resetStore
```
Clear all MST store data and reset to initial state.

### 🛠 **Development Commands**

#### Show Dev Menu
```
Command: showDevMenu
```
Opens the React Native development menu.

## Development Shortcuts

Global functions available in development console:

```javascript
// Show API statistics and history
debugApi()

// Clear all application data
clearAllData()
```

## API Monitoring Features

### Real-time Tracking

The API monitoring system automatically tracks:

- **Request Details**: Method, URL, headers, parameters, body
- **Response Details**: Status, data, headers, errors
- **Performance Metrics**: Response times, cache hits, retries
- **User Context**: User ID, authentication status
- **Advanced Features**: Deduplication, caching, analytics

### Analytics Dashboard

Access comprehensive analytics through Reactotron:

```javascript
// View in Reactotron console
console.tron.display({
  name: "API Analytics",
  value: globalAnalyticsManager.generateReport()
})
```

### Error Tracking

Failed requests are automatically logged with:
- Error details and stack traces
- Request context
- Retry attempts
- User impact analysis

## Configuration

### Environment-Specific Settings

The integration supports different configurations for:

- **Development**: Full logging and debugging features
- **Staging**: Limited logging for testing
- **Production**: Completely disabled

### Custom Configuration

Modify `ReactotronDevConfig.ts` to customize:

```typescript
export const ReactotronDevConfig = {
  development: {
    name: "Your App Name",
    host: "localhost",
    port: 9090,
    features: {
      mst: true,
      mmkv: true,
      networking: true,
      // ... other features
    }
  }
}
```

## Troubleshooting

### Connection Issues

1. **Cannot Connect to Reactotron**
   - Ensure Reactotron desktop app is running
   - Check firewall settings
   - Verify IP address configuration for devices

2. **Commands Not Appearing**
   - Restart the app (custom commands require app restart)
   - Check Reactotron logs for errors

3. **API Monitoring Not Working**
   - Verify the services layer is properly configured
   - Check console for integration errors

### Common Solutions

#### Reset Everything
```bash
# Clear all data and restart
npm run start -- --reset-cache
```

#### Debug Connection
```javascript
// In development console
console.log("Reactotron status:", console.tron ? "Connected" : "Not connected")
```

## Best Practices

### Development Workflow

1. **Start Reactotron first** before launching the app
2. **Use custom commands** for quick debugging tasks
3. **Monitor API statistics** regularly during development
4. **Clear monitoring data** periodically to avoid memory issues

### Performance Monitoring

1. **Watch response times** for performance bottlenecks
2. **Monitor cache effectiveness** to optimize caching strategies
3. **Track error rates** to identify problem areas
4. **Analyze usage patterns** for optimization opportunities

### Security Considerations

1. **Disable in production** - Reactotron is automatically disabled
2. **Don't commit sensitive data** in custom commands
3. **Use environment variables** for configuration

## Integration with Services Layer

The Reactotron integration seamlessly works with the enhanced services layer:

### Automatic Tracking

All API services automatically report to Reactotron:
- `AuthAPI` - Authentication requests
- `UserAPI` - User management operations
- `OrderAPI` - Order lifecycle tracking
- `FabricAPI` - Catalog operations

### Enhanced Interceptors

The enhanced interceptors provide Reactotron integration:
- Request/response logging
- Performance monitoring
- Error tracking
- Cache monitoring

### Analytics Integration

Real-time analytics are available through:
- `globalAnalyticsManager`
- `globalCacheManager`
- `globalDeduplicationManager`

## Future Enhancements

Potential future additions:

1. **Performance Snapshots** - Capture app performance at specific moments
2. **Network Simulation** - Simulate slow/offline conditions
3. **Custom Benchmarks** - Track specific performance metrics
4. **Automated Testing** - Run API tests through Reactotron
5. **Advanced Filtering** - Filter logs and requests by criteria

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review Reactotron documentation: https://docs.infinite.red/reactotron/
3. Check console logs for error messages
4. Verify network connectivity and configuration

---

**Note**: This integration is designed for development and debugging purposes only. All Reactotron functionality is automatically disabled in production builds.