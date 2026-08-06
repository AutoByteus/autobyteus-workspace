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
@@
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

### Example 2: Replace a final line and intentionally omit its line terminator

<tool name="edit_file">
    <arguments>
        <arg name="path">/path/to/version.txt</arg>
        <arg name="patch">
__START_PATCH__
@@
-version=old
\\ No newline at end of file
+version=new
\\ No newline at end of file
__END_PATCH__
        </arg>
    </arguments>
</tool>

### Example 3: Add new lines to a configuration file

<tool name="edit_file">
    <arguments>
        <arg name="path">/path/to/config/settings.yaml</arg>
        <arg name="patch">
__START_PATCH__
@@
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
