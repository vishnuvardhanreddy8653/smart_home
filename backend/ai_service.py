import ollama
import json

class AIService:
    def __init__(self, model: str = "mistral"):
        self.model = model
        self.context = {} # Store conversation state: {'pending_action': ...}

    def process_command(self, command_text: str):
        """
        FAST PATH: pattern matching for milliseconds response.
        SLOW PATH: Ollama for complex queries.
        """
        command_text = command_text.lower().strip()
        
        # --- CONTEXT CHECK (Handling "Yes" / "No") ---
        if self.context.get('pending_offer'):
            if command_text in ["yes", "yeah", "sure", "please", "confirm"]:
                action_to_do = self.context.pop('pending_offer')
                # Recursively process the confirmed action
                return self.process_command(action_to_do)
            elif command_text in ["no", "nah", "cancel"]:
                self.context.pop('pending_offer')
                return {
                    "action": "none",
                    "response_text": "Okay, leaving it off."
                }
        
        # --- FAST PATH (Regex) ---
        import re
        
        # Pattern: "turn (on|off) (the) (light|fan...|all|everything|number X)"
        # Regex to capture action and device
        match = re.search(r"(turn|switch)\s+(on|off)\s+(?:the\s+)?(?:(\w+)\s+)?(light|fan|relay|tv|fridge|refrigerator|home theater|hometheater|ac|heater|all|everything|number \d+|\d+)", command_text)
        
        if match:
            action_word = match.group(2) # on/off
            location = match.group(3) or "unknown"
            device_raw = match.group(4) # light/fan
            
            # --- HANDLE NUMBERS ---
            number_map = {
                '1': 'light',
                '2': 'fan',
                '3': 'kitchen light',
                '4': 'refrigerator',
                '5': 'tv',
                '6': 'hometheater'
            }
            # Extract number if present "number 1" or "1"
            import re as regex_lib
            num_match = regex_lib.search(r"\d+", device_raw)
            if num_match:
                num = num_match.group(0)
                if num in number_map:
                    device_raw = number_map[num]

            # Normalize device names
            if device_raw in ["fridge", "refrigerator"]: device_raw = "refrigerator"
            if device_raw in ["home theater", "hometheater"]: device_raw = "hometheater"
            
            action = "turn_on" if action_word == "on" else "turn_off"
            print(f"⚡ FAST PATH TRIGGERED: {action} {device_raw}")

            # --- HANDLE ALL ---
            if device_raw in ["all", "everything"]:
                return {
                    "action": action,
                    "device_type": "all",
                    "location": "all",
                    "response_text": f"OK, turning {action_word} everything."
                }
            
            # Special Rule: TV -> Offer Home Theater
            response_text = f"OK, turning {action_word} the {device_raw}."
            
            if device_raw == "tv" and action == "turn_on":
                self.context['pending_offer'] = "turn on hometheater"
                response_text = "TV is ON. Shall I turn on the Home Theater as well?"
            
            return {
                "action": action,
                "device_type": device_raw,
                "location": location,
                "response_text": response_text
            }

        # --- SLOW PATH (LLM) ---
        print(f"🐢 SLOW PATH (LLM) TRIGGERED: {command_text}")
        prompt = f"""
        Extract intent from: "{command_text}".
        Return JSON with: action ("turn_on", "turn_off"), device_type, location, response_text.
        """
        
        try:
            response = ollama.chat(model=self.model, messages=[
                {'role': 'user', 'content': prompt},
            ])
            content = response['message']['content']
            # Clean up potential markdown code blocks
            content = content.replace("```json", "").replace("```", "").strip()
            # Find the first { and last }
            start = content.find('{')
            end = content.rfind('}') + 1
            if start != -1 and end != -1:
                return json.loads(content[start:end])
            else:
                 return {"action": "error", "response_text": "Could not parse AI response."}
        except Exception as e:
            print(f"Error calling Ollama: {e}")
            return {
                "action": "error",
                "response_text": "I'm sorry, I couldn't process that command."
            }

ai_service = AIService()
