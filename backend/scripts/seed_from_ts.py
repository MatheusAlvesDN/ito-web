import argparse
import json
import os
import sys

# Adiciona o diretório backend ao PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core.migrations import run_migrations
from app.models.game import Game, Theme, Question, ImpostorScenario, WhoAmIPersonality

def run_seed(reset: bool = False):
    """Popula o conteúdo dos jogos. Por padrão só age com o banco vazio, para não
    apagar edições dos admins; reset=True apaga e recria o conteúdo (nunca os admins)."""
    print("Iniciando processo de seeding do banco de dados...")
    run_migrations()

    db = SessionLocal()
    if not reset and db.query(Game).count() > 0:
        db.close()
        print("O banco já tem conteúdo; nada a fazer. Use --reset para apagar e repopular.")
        return

    json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "seed_data.json")
    if not os.path.exists(json_path):
        print(f"Erro: Arquivo {json_path} não encontrado.")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    try:
        # Limpar conteúdo antigo (tabelas de admin ficam intactas)
        db.query(WhoAmIPersonality).delete()
        db.query(ImpostorScenario).delete()
        db.query(Question).delete()
        db.query(Theme).delete()
        db.query(Game).delete()
        db.commit()

        total_questions = 0
        total_scenarios = 0
        total_personalities = 0
        total_themes = 0

        for game_data in data["games"]:
            game_id = game_data["id"]
            game = Game(
                id=game_id,
                name=game_data["name"],
                description=game_data.get("description"),
                icon=game_data.get("icon", "Gamepad2")
            )
            db.add(game)
            db.commit()
            print(f"Jogo cadastrado: {game.name} ({game.id})")

            # Inserir Temas do Jogo
            for t in game_data.get("themes", []):
                theme_composite_id = f"{game_id}_{t['id']}"
                theme = Theme(
                    id=theme_composite_id,
                    original_theme_id=t["id"],
                    game_id=game_id,
                    name=t["name"],
                    description=t.get("description"),
                    color=t.get("color", "bg-slate-200"),
                    text_color=t.get("textColor", "text-slate-900"),
                    button_color=t.get("buttonColor"),
                    icon=t.get("icon", "Star"),
                    is_active=True
                )
                db.add(theme)
                total_themes += 1
            db.commit()

            # Perguntas (Classic e WhatDoYouKnow)
            if "questionsByTheme" in game_data and game_data["questionsByTheme"]:
                for orig_theme_id, q_list in game_data["questionsByTheme"].items():
                    theme_comp_id = f"{game_id}_{orig_theme_id}"
                    for q_text in q_list:
                        question = Question(
                            theme_id=theme_comp_id,
                            content=q_text
                        )
                        db.add(question)
                        total_questions += 1
                db.commit()

            # Cenários (Impostor)
            if "scenariosByTheme" in game_data and game_data["scenariosByTheme"]:
                for orig_theme_id, scenarios in game_data["scenariosByTheme"].items():
                    # Mapeia 'default' para o tema 'free'
                    target_theme = "free" if orig_theme_id == "default" else orig_theme_id
                    theme_comp_id = f"{game_id}_{target_theme}"
                    for s in scenarios:
                        scenario = ImpostorScenario(
                            theme_id=theme_comp_id,
                            honest=s["honest"],
                            impostor_variations=s["impostorVariations"]
                        )
                        db.add(scenario)
                        total_scenarios += 1
                db.commit()

            # Personalidades (WhoAmI)
            if "personalitiesByTheme" in game_data and game_data["personalitiesByTheme"]:
                for orig_theme_id, pers_list in game_data["personalitiesByTheme"].items():
                    theme_comp_id = f"{game_id}_{orig_theme_id}"
                    for p_name in pers_list:
                        personality = WhoAmIPersonality(
                            theme_id=theme_comp_id,
                            name=p_name
                        )
                        db.add(personality)
                        total_personalities += 1
                db.commit()

        print("\n Seeding concluído com sucesso!")
        print(f"- Jogos: {len(data['games'])}")
        print(f"- Temas: {total_themes}")
        print(f"- Perguntas: {total_questions}")
        print(f"- Cenários de Impostor: {total_scenarios}")
        print(f"- Personalidades cadastradas: {total_personalities}")

    except Exception as e:
        db.rollback()
        print(f"Erro durante o seed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Popula o banco com o conteúdo de seed_data.json.")
    parser.add_argument("--reset", action="store_true", help="apaga todo o conteúdo dos jogos e repopula")
    run_seed(reset=parser.parse_args().reset)
