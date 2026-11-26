package com.bgssai.corporate;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TemplateController {
    record Scene(String id, String caption, int duration, String image) {}
    record Template(String id, String name, String company, String title, String aspect,
                    String brandColor, String closingLine, List<Scene> scenes) {}

    private static final String CAMPUS = "/images/campus.jpg";
    private static final String WORKSHOP = "/images/workshop.jpg";
    private static final String TEAM = "/images/team.jpg";

    private static final List<Template> TEMPLATES = List.of(
            new Template("brand", "品牌形象片", "远川设计", "让想法成为现实", "16:9",
                    "#c3e5a8", "预约到访 · 了解远川", List.of(
                    new Scene("opening", "在这里，每一个想法都有机会成为现实。", 4, CAMPUS),
                    new Scene("craft", "从第一张草图，到反复打磨的细节。", 5, WORKSHOP),
                    new Scene("people", "我们与合作伙伴，一起设计下一种可能。", 4, TEAM))),
            new Template("product", "产品推介片", "远川精工", "看见细节的力量", "9:16",
                    "#f6ab75", "联系产品顾问 · 预约演示", List.of(
                    new Scene("detail", "把产品交到你手中之前，我们先看遍每一个细节。", 4, WORKSHOP),
                    new Scene("development", "和使用者一起测试，让每一次改进都有依据。", 4, TEAM),
                    new Scene("contact", "欢迎预约，来现场体验。", 3, CAMPUS))),
            new Template("recruitment", "团队招募片", "远川设计", "下一位同事，会是你吗", "16:9",
                    "#81cee0", "加入远川 · 投递作品集", List.of(
                    new Scene("colleagues", "这是和你一起解决问题的人。", 4, TEAM),
                    new Scene("day", "你可以在这里，把自己的设计做成样品。", 5, WORKSHOP),
                    new Scene("invite", "带上作品，来和我们聊聊。", 3, CAMPUS))));

    @GetMapping("/api/templates")
    public List<Template> templates() {
        return TEMPLATES;
    }
}
