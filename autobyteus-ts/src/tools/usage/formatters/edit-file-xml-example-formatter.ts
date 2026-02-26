import { BaseExampleFormatter } from './base-formatter.js';
import { ToolDefinition } from '../../registry/tool-definition.js';

export class EditFileXmlExampleFormatter implements BaseExampleFormatter {
  provide(_toolDefinition: ToolDefinition): string {
    return `### Example 1: Modify a function in a Python file

<tool name="edit_file">
    <arguments>
        <arg name="path">/path/to/utils.py</arg>
        <arg name="patch">
__START_PATCH__
--- a/utils.py
+++ b/utils.py
@@ -10,7 +10,7 @@
 def calculate_total(items):
     """Calculate the total price of items."""
     total = 0
-    for item in items:
+    for item in sorted(items, key=lambda x: x.price):
         total += item.price
     return total
__END_PATCH__
        </arg>
    </arguments>
</tool>

### Example 2: Add new lines to a configuration file

<tool name="edit_file">
    <arguments>
        <arg name="path">config/settings.yaml</arg>
        <arg name="patch">
__START_PATCH__
--- a/settings.yaml
+++ b/settings.yaml
@@ -5,3 +5,6 @@
 logging:
   level: INFO
   format: "%(asctime)s - %(message)s"
+
+cache:
+  enabled: true
+  ttl: 3600
__END_PATCH__
        </arg>
    </arguments>
</tool>`;
  }
}
