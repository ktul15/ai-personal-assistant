import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

const _flavor = String.fromEnvironment('APP_FLAVOR', defaultValue: 'dev');

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const App());
}

final _router = GoRouter(
  debugLogDiagnostics: _flavor != 'prod',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const Scaffold(
        body: Center(child: Text('AI Assistant')),
      ),
    ),
  ],
);

class App extends StatelessWidget {
  const App({super.key});

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      child: MaterialApp.router(
        title: 'AI Assistant',
        routerConfig: _router,
      ),
    );
  }
}
