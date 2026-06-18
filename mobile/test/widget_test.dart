import 'package:aiassistant/main.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('App', () {
    testWidgets('renders root route without crashing', (WidgetTester tester) async {
      await tester.pumpWidget(const App());
      await tester.pumpAndSettle();
      expect(find.text('AI Assistant'), findsOneWidget);
    });
  });
}
